const shell = require('shelljs');
const path = require('path');
const { default: axios } = require('axios');
const args = require('minimist')(process.argv.slice(2));

const databasePath = path.join(__dirname, '../dist/database');
const inAppTutorialsContentPath = path.join(
  __dirname,
  '../dist/tutorials/in-app'
);
const databaseDestination = `s3://resources.gdevelop-app.com/in-app-tutorials-database`;
const inAppTutorialsDestination = `s3://resources.gdevelop-app.com/in-app-tutorials`;

if (!args['cf-zoneid'] || !args['cf-token']) {
  shell.echo(
    '❌ You must pass --cf-zoneid, --cf-token to purge the CloudFare cache.'
  );
  shell.exit(1);
}

{
  shell.echo(
    'ℹ️ Uploading in app tutorials to resources.gdevelop-app.com/in-app-tutorials...'
  );
  const output = shell.exec(
    `aws s3 sync ${inAppTutorialsContentPath} ${inAppTutorialsDestination} --acl public-read`
  );
  if (output.code !== 0) {
    shell.echo(
      '❌ Unable to upload in app tutorials to resources.gdevelop-app.com/in-app-tutorials. Error is:'
    );
    shell.echo(output.stdout);
    shell.echo(output.stderr);
    shell.exit(output.code);
  }
}

{
  shell.echo(
    'ℹ️ Uploading database to resources.gdevelop-app.com/in-app-tutorials-database...'
  );
  const output = shell.exec(
    `aws s3 sync ${databasePath} ${databaseDestination} --acl public-read`
  );
  if (output.code !== 0) {
    shell.echo(
      '❌ Unable to upload database to resources.gdevelop-app.com/in-app-tutorials-database. Error is:'
    );
    shell.echo(output.stdout);
    shell.echo(output.stderr);
    shell.exit(output.code);
  }
}

shell.echo('✅ Upload finished');

shell.echo('ℹ️ Purging Cloudflare cache...');

const zoneId = args['cf-zoneid'];
const purgeCacheUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

axios
  .post(
    purgeCacheUrl,
    {
      files: [
        // Update the "database"
        'https://resources.gdevelop-app.com/in-app-tutorials-database/inAppTutorialShortHeaders.json',
        // Update the full tutorials
        'https://resources.gdevelop-app.com/in-app-tutorials/flingGame.json',
        // Update the guided lessons and their templates.
        'https://resources.gdevelop-app.com/in-app-tutorials/plinkoMultiplier.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/templates/plinkoMultiplier/game.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/cameraParallax.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/templates/cameraParallax/game.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/healthBar.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/templates/healthBar/game.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/joystick.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/templates/joystick/game.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/timer.json',
        'https://resources.gdevelop-app.com/in-app-tutorials/templates/timer/game.json',
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${args['cf-token']}`,
        'Content-Type': 'application/json',
      },
    }
  )
  .then((response) => response.data)
  .then(() => {
    shell.echo('✅ Cache purge done.');
  })
  .catch((error) => {
    shell.echo(
      '❌ Error while requesting cache purge (are your identifiers correct?)'
    );
    shell.echo(error.message || '(unknown error)');
    shell.exit(1);
  });
