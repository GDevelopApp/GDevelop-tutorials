// @ts-check

/**
 * @typedef {import('../types').InAppTutorialFlowMetaStep} InAppTutorialFlowMetaStep
 * @typedef {import('../types').InAppTutorialFlowStep} InAppTutorialFlowStep
 */

/**
 * @param {InAppTutorialFlowMetaStep} metaStep
 * @returns {InAppTutorialFlowStep[]}
 */
const translateMetaStep = (metaStep) => {
  switch (metaStep.metaKind) {
    case 'launch-preview':
      const isStandalone =
        metaStep.nextStep !== 'previewLaunched' &&
        !!metaStep.nextStep.clickOnTooltipButton;
      return [
        {
          id: metaStep.id,
          elementToHighlightId: '#toolbar-preview-button',
          nextStepTrigger:
            metaStep.nextStep === 'previewLaunched'
              ? {
                  previewLaunched: true,
                  inGameMessage: metaStep.inGameMessage,
                  inGameTouchMessage: metaStep.inGameTouchMessage,
                  inGameMessagePosition: metaStep.inGameMessagePosition,
                }
              : {
                  clickOnTooltipButton: metaStep.nextStep.clickOnTooltipButton,
                },
          tooltip: {
            standalone: isStandalone,
            description: metaStep.description || {
              messageByLocale: {
                en: "We're done! Let's test our game to see the changes we've made! Click on the **Preview** button.",
                fr: 'Nous avons terminé ! Testons notre jeu pour voir les changements que nous avons apportés ! Cliquez sur le bouton **Aperçu**.',
                ar: 'حسنًا، لقد انتهينا! هيّا نختبر لعبتنا لنرى التغييرات التي قمنا بها! الضغط على الزر **معاينة**.',
                de: 'Wir sind fertig! Lassen Sie uns unser Spiel testen, um die Änderungen zu sehen, die wir vorgenommen haben! Klicken Sie auf die **Vorschau**-Schaltfläche.',
                es: '¡Hemos terminado! ¡Probemos nuestro juego para ver los cambios que hemos hecho! Haga clic en el botón **Vista previa**.',
                it: 'abbiamo finito! Proviamo il nostro gioco per vedere le modifiche che abbiamo apportato! Clicca sul pulsante **Anteprima**.',
                tr: 'Tamamlandık! Yaptığımız değişiklikleri görmek için oyunumuzu test edelim! **Önizleme** düğmesine tıklayın.',
                ja: '完了です！私たちが行った変更を確認するためにゲームをテストしましょう！**プレビュー**ボタンをクリックします。',
                ko: '우리는 끝났습니다! 우리가 한 변경 사항을 확인하기 위해 게임을 테스트해 봅시다! **미리보기** 버튼을 클릭합니다.',
                pl: 'Skończyliśmy! Przetestujmy naszą grę, aby zobaczyć zmiany, jakie wprowadziliśmy! Kliknij przycisk **Podgląd**.',
                pt: 'Nós terminamos! Vamos testar nosso jogo para ver as mudanças que fizemos! Clique no botão **Visualizar**.',
                ru: 'Мы закончили! Давайте протестируем нашу игру, чтобы увидеть изменения, которые мы внесли! Нажмите на кнопку **Предварительный просмотр**.',
                sl: 'Končali smo! Testirajmo našo igro, da vidimo spremembe, ki smo jih naredili! Kliknite na gumb **Predogled**.',
                sq: 'Kemi përfunduar! Le të testojmë lojën tonë për të parë ndryshimet që kemi bërë! Kliko në butonin **Parashiko**.',
                th: 'เราเสร็จแล้ว! มาทดสอบเกมของเราเพื่อดูการเปลี่ยนแปลงที่เราได้ทำ! คลิกที่ปุ่ม **ตัวอย่าง**',
                uk: 'Ми закінчили! Давайте протестуємо нашу гру, щоб побачити зміни, які ми зробили! Натисніть на кнопку **Попередній перегляд**.',
                zh: '我们完成了！让我们测试游戏，看看我们所做的更改！点击**预览**按钮。',
              },
            },
            placement: isStandalone ? undefined : 'bottom',
          },
        },
      ];
    case 'add-behavior':
      return [
        {
          elementToHighlightId: '#toolbar-open-objects-panel-button',
          nextStepTrigger: {
            presenceOfElement: '#add-new-object-button',
          },
          tooltip: {
            description: {
              messageByLocale: {
                en: 'Open the **Objects** panel.',
                fr: 'Ouvrez le panneau des **objets**.',
                ar: 'فتح لوحة **الكائنات**.',
                de: 'Öffnen Sie das **Objekte**-Panel.',
                es: 'Abre el panel de **objetos**.',
                it: 'Apri il pannello **Oggetti**.',
                tr: 'Nesneler panelini açın.',
                ja: '**オブジェクト**パネルを開いてください。',
                ko: '**오브젝트** 패널을 엽니다.',
                pl: 'Otwórz panel **Obiekty**.',
                pt: 'Abra o painel de **objetos**.',
                ru: 'Откройте панель **Объекты**.',
                sl: 'Odpri panel **Predmeti**.',
                sq: 'Hapni panelin e **objekteve**.',
                th: 'เปิดแผงควบคุม **วัตถุ**',
                uk: "Відкрийте панель **Об'єкти**.",
                zh: '打开**对象**面板。',
              },
            },
            placement: 'bottom',
            mobilePlacement: 'top',
          },
          skippable: true,
        },
        {
          elementToHighlightId: `objectInObjectsList:${metaStep.objectKey}`,
          nextStepTrigger: {
            presenceOfElement: '#object-editor-dialog',
          },
          tooltip: {
            placement: 'top',
            description: metaStep.objectHighlightDescription,
            ...(metaStep.objectHighlightTouchDescription
              ? { touchDescription: metaStep.objectHighlightTouchDescription }
              : undefined),
          },
        },
        {
          elementToHighlightId: '#behaviors-tab',
          nextStepTrigger: {
            presenceOfElement: '#add-behavior-button',
          },
          tooltip: {
            description: {
              messageByLocale: {
                en: 'See the **behaviors** of the **object** here.',
                fr: "Les **comportements** de **l'objet** se trouvent dans cet onglet.",
                ar: 'رؤية **سلوكيات الكائن** من هنا.',
                de: 'Sehen Sie sich die **Verhaltensweisen** des **Objekts** hier an.',
                es: 'Los **comportamientos** del **objeto** se encuentran en esta pestaña.',
                it: "Vedi i **comportamenti** dell'**oggetto** qui.",
                tr: '**Nesnenin** **davranışlarını** burada görün.',
                ja: 'ここに **オブジェクト** の **動作** を見る。',
                ko: '여기서 **객체**의 **동작**을 확인하세요.',
                pl: 'Zobacz **akcje** **obiektu** tutaj.',
                pt: 'Veja os **comportamentos** do **objeto** aqui.',
                ru: 'Смотрите **поведение** **объекта** здесь.',
                sl: 'Oglejte si **vedenja** **predmeta** tukaj.',
                sq: 'Shikoje **veprimet** te **objektit** ketu.',
                th: 'ดู **พฤติกรรม** ของ **วัตถุ** ที่นี่',
                uk: "Дивіться **поведінку** **об'єкта** тут.",
                zh: '在这里查看 **对象** 的 **动作**。',
              },
            },
            placement: 'bottom',
          },
          skippable: true,
          isOnClosableDialog: true,
        },
        {
          elementToHighlightId: '#add-behavior-button',
          nextStepTrigger: {
            presenceOfElement: metaStep.behaviorListItemId,
          },
          tooltip: {
            description: {
              messageByLocale: {
                en: `Let's add the **${metaStep.behaviorDisplayName}** behavior.`,
                fr: `Ajoutons le comportement **${metaStep.behaviorDisplayName}**.`,
                ar: `هيّا نقوم بإضافة السلوك **${metaStep.behaviorDisplayName}**.`,
                de: `Fügen wir das **${metaStep.behaviorDisplayName}**-Verhalten hinzu.`,
                es: `Agreguemos el comportamiento **${metaStep.behaviorDisplayName}**.`,
                it: `Aggiungiamo il comportamento **${metaStep.behaviorDisplayName}**.`,
                tr: `**${metaStep.behaviorDisplayName}** davranışını ekleyelim.`,
                ja: `**${metaStep.behaviorDisplayName}** の動作を追加しましょう。`,
                ko: `**${metaStep.behaviorDisplayName}** 동작을 추가해 봅시다.`,
                pl: `Dodajmy zachowanie **${metaStep.behaviorDisplayName}**.`,
                pt: `Vamos adicionar o comportamento **${metaStep.behaviorDisplayName}**.`,
                ru: `Добавим **поведение ${metaStep.behaviorDisplayName}**.`,
                sl: `Dodajmo **vedenje ${metaStep.behaviorDisplayName}**.`,
                sq: `Hajde te shtojme **${metaStep.behaviorDisplayName}** verpim.`,
                th: `เพิ่ม **${metaStep.behaviorDisplayName}** พฤติกรรม`,
                uk: `Додайте **поведінку ${metaStep.behaviorDisplayName}**.`,
                zh: `添加 **${metaStep.behaviorDisplayName}** 动作。`,
              },
            },
          },
          isOnClosableDialog: true,
        },
        {
          elementToHighlightId: metaStep.behaviorListItemId,
          nextStepTrigger: {
            presenceOfElement: metaStep.behaviorParameterPanelId,
          },
          tooltip: {
            description: {
              messageByLocale: {
                en: `Select the ${metaStep.behaviorDisplayName} behavior.`,
                fr: `Sélectionnez le comportement ${metaStep.behaviorDisplayName}.`,
                ar: `تحديد السلوك ${metaStep.behaviorDisplayName}.`,
                de: `Wählen Sie das ${metaStep.behaviorDisplayName}-Verhalten aus.`,
                es: `Selecciona el comportamiento ${metaStep.behaviorDisplayName}.`,
                it: `Seleziona il comportamento ${metaStep.behaviorDisplayName}.`,
                tr: `${metaStep.behaviorDisplayName} davranışını seçin.`,
                ja: `${metaStep.behaviorDisplayName} の動作を選択します。`,
                ko: `${metaStep.behaviorDisplayName} 동작을 선택하세요.`,
                pl: `Wybierz zachowanie ${metaStep.behaviorDisplayName}.`,
                pt: `Selecione o comportamento ${metaStep.behaviorDisplayName}.`,
                ru: `Выберите поведение ${metaStep.behaviorDisplayName}.`,
                sl: `Izberite vedenje ${metaStep.behaviorDisplayName}.`,
                sq: `Selekto ${metaStep.behaviorDisplayName} veprim.`,
                th: `เลือกพฤติกรรม ${metaStep.behaviorDisplayName}`,
                uk: `Виберіть поведінку ${metaStep.behaviorDisplayName}.`,
                zh: `选择 ${metaStep.behaviorDisplayName} 动作。`,
              },
            },
          },
          isOnClosableDialog: true,
        },
        ...(metaStep.parameters
          ? metaStep.parameters.map((parameterData) => ({
              elementToHighlightId: `${metaStep.behaviorParameterPanelId} ${parameterData.parameterId}`,
              nextStepTrigger: {
                valueEquals: parameterData.expectedValue,
              },
              tooltip: {
                description: parameterData.description,
              },
              isOnClosableDialog: true,
            }))
          : []),
        {
          elementToHighlightId: '#object-editor-dialog #apply-button',
          nextStepTrigger: {
            absenceOfElement: '#object-editor-dialog',
          },
          tooltip: {
            description: metaStep.finishedConfigurationDescription || {
              messageByLocale: {
                en: "We're done.",
                fr: 'Nous avons terminé.',
                ar: 'انتهينا.',
                de: 'Wir sind fertig.',
                es: 'Hemos terminado.',
                it: 'Abbiamo finito.',
                tr: 'Tamamlandık.',
                ja: '完了です。',
                ko: '끝났습니다.',
                pl: 'Skończyliśmy.',
                pt: 'Terminamos.',
                ru: 'Мы закончили.',
                sl: 'Končali smo.',
                sq: 'Kemi përfunduar.',
                th: 'เราเสร็จแล้ว',
                uk: 'Ми закінчили.',
                zh: '我们完成了。',
              },
            },
          },
        },
      ];
    default:
      return [];
  }
};

exports.translateMetaStep = translateMetaStep;
