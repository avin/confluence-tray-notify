const { shell, ipcRenderer } = require('electron');

let config = {};

function init() {
  function addStyle(styleString) {
    const style = document.createElement('style');
    style.textContent = styleString;
    document.head.append(style);
  }

  addStyle(`
  .mw-header {
    display: none !important;
  }
  #mw-container .mw-notifications-list, #mw-container .mw-tasks-list {    
    max-height: 100% !important;    
    height: 100% !important;    
  }
`);

  try {
    const { authenticator } = require('otplib');
    const $ = require('jquery');
    const _ = require('lodash');

    let checkTimer;

    // Если просит пин
    if ($('#2fpin').length) {
      const pinSecret = _.get(config, ['auth', 'pinSecret']);
      if (pinSecret) {
        const token = authenticator.generate(pinSecret);

        $('#2fpin').val(token);
        $('input[type="submit"]').click();
      }
    }

    // Если просит пароль
    if ($('[name="os_username"]').length) {
      const username = _.get(config, ['auth', 'username']);
      const password = _.get(config, ['auth', 'password']);
      if (username && password) {
        $('[name="os_username"]').val(username);
        $('[name="os_password"]').val(password);
        $('[name="os_cookie"]').prop('checked', true);

        $('[name="login"]').click();
      }
    }

    // Если есть признак, что залогинились
    if ($('#user-menu-link').length) {
      document.location = `${config.root}/plugins/servlet/notifications-miniview`;
    }

    // Переходы по внешним ссылкам делаем во внешнем браузере
    $('body').on('click', 'a', (event) => {
      if (event.target.getAttribute('target') === '_blank') {
        event.preventDefault();
        let link = event.target.href;
        shell.openExternal(link);
      }
    });

    if ($('#mw-container').length) {
      let isFocused = false;

      clearInterval(checkTimer);
      checkTimer = setInterval(() => {
        $.get(`${config.root}/rest/mywork/latest/status/notification/count`).then((result) => {
          ipcRenderer.sendToHost('tasksCounter', { count: result.count });

          if (!isFocused) {
            location.reload();
          }
        });
      }, 5000);

      ipcRenderer.on('wv-focus', () => {
        isFocused = true;
      });
      ipcRenderer.on('wv-blur', () => {
        isFocused = false;
      });
    }
  } catch (e) {
    alert(e.message);
  }
}

ipcRenderer.on('config', (e, data) => {
  config = data;

  init();
});
