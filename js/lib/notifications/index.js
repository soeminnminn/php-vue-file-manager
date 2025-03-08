import { toRaw, reactive } from 'vue';
import NotificationIcon from './notification-icon.js';
import NotificationsContainer from './notifications-container.js';
import NotificationComp from './notification.js';
// import './notifications.css';

/**
 * @readonly
 * @enum {'default'|'info'|'success'|'warning'|'error'}
 */
export const NotificationTypes = ['default', 'info', 'success', 'warning', 'error'];

/**
 * @typedef NotificationOptions
 * @type {object}
 * @property {string} icon
 * @property {string} closeIcon
 * @property {string} loadingIcon
 * @property {number} duration
 * @property {number} limit
 * @property {NotificationTypes} defaultType
 */

/**
 * @readonly
 * @type {NotificationOptions}
 */
export const configDefaults = {
  icon: 'default',
  closeIcon: 'close',
  loadingIcon: 'loading',
  duration: 6000,
  limit: 0,
  defaultType: NotificationTypes[0],
};

class Notification {
  /**
   * @param {object} options 
   * @constructor
   */
  constructor(options) {
    this.id = '';
    this.type = '';
    this.title = null;
    this.text = null;
    this.icon = null;
    this.closable = false;
    this.loading = false;
    this.duration = 0;
    this.status = 'active';
    this.props = null;

    this.timestamp = Date.now();
    this.timerAt = null;
    this.pausedAt = null;

    this.timer = null;

    this.update(options);
  }

  /**
   * @returns {boolean}
   */
  get isActive() {
    return this.status === 'active';
  }

  /**
   * @returns {boolean}
   */
  get isPaused() {
    return this.pausedAt !== undefined;
  }

  /**
   * @param {object} param0 
   */
  update({ props, ...options }) {
    Object.assign(this, options);
    props && (this.props = toRaw(props));
  }
}

class NotificationManager {
  /**
   * @param {?NotificationOptions} options - {@link NotificationOptions}
   * @constructor
   */
  constructor(options) {
    this.options = options || {};
    this.id = 1;
    this.defaults = {};
    this.list = reactive([]);
    this.queue = reactive([]);
  }

  /**
   * @param  {...any} args 
   * @returns {NotificationOptions}
   */
  parseOptions(...args) {
    let text;
    let error;
    if (typeof args[0] === 'string') {
      text = args.shift();
    }

    if (args[0] instanceof Error) {
      error = args.shift();
    }

    const options = (args.shift() || {});

    text && (options.text = text);

    if (error) {
      options.text = error.message;
      options.type = 'error';
    }

    return options;
  }

  /**
   * @param {string} type 
   * @param {any} defaults 
   */
  setDefaults(type, defaults) {
    this.defaults[type] = defaults;
  }

  /**
   * @param {string} id Notification's id.
   * @returns {Notification|undefined}
   */
  get(id) {
    return this.list.find((item) => item.id === id);
  }

  /**
   * @param {Notification|string} notificationOrId 
   * @returns {boolean}
   */
  isOpen(notificationOrId) {
    const notification = this.resolve(notificationOrId);
    return !!notification && notification.status !== 'closed';
  }

  /**
   * @param  {...any} args 
   * @returns {Notification}
   */
  open(...args) {
    const parsedOptions = this.parseOptions(...args);
    const type = parsedOptions.type || this.options.defaultType;

    const defaults = {
      id: this.id++,
      type: this.options.defaultType,
      duration: this.options.duration,
      closable: true,
    };

    const mergedOptions = Object.assign(defaults, this.defaults[type], parsedOptions);

    const existing = this.get(mergedOptions.id);

    if (existing) {
      this.update(existing, mergedOptions);
      this.reset(existing);
      return existing;
    }

    const notification = reactive(new Notification(mergedOptions));

    if (this.options.limit && this.list.length >= this.options.limit) {
      notification.status = 'queue';
    }

    this.getList(notification).push(notification);
    this.schedule(notification);

    return notification;
  }

  /**
   * @param {Promise} promise 
   * @param {object} param1 
   * @returns {Notification}
   */
  promise(promise, { pending, success, error, ...options }) {
    const notification = this.open({
      ...options,
      ...pending,
      loading: true,
    });

    promise.then(() => this.update(notification, {
      ...success,
      loading: false,
    })).catch((err) => this.update(notification, {
      ...(err ? { text: err.message } : {}),
      ...error,
      loading: false,
    }));

    return notification;
  }

  /**
   * @param {string|Notification} id 
   */
  reset(id) {
    const notification = this.resolve(id);

    if (!notification || !notification.isActive) {
      return;
    }

    notification.timerAt = undefined;
    this.stop(notification);

    this.list.splice(this.list.indexOf(notification), 1);
    this.list.push(notification);

    !notification.isPaused && this.schedule(notification);
  }

  /**
   * @param {string|Notification} id 
   * @param {NotificationOptions} options 
   */
  update(id, options) {
    const notification = this.resolve(id);

    if (!notification) {
      return;
    }

    notification.update(options);
    !notification.isPaused && this.schedule(notification);
  }

  /**
   * @param {string|Notification} id 
   */
  close(id) {
    const notification = this.resolve(id);

    if (!notification || notification.status === 'closed') {
      return;
    }

    this.stop(notification);

    const list = this.getList(notification);
    list.splice(list.indexOf(notification), 1);

    notification.status = 'closed';

    this.updateQueue();
  }

  /**
   * @param {string|Notification} id 
   */
  pause(id) {
    const notification = this.resolve(id);

    if (!notification || !notification.timer) {
      return;
    }

    notification.pausedAt = Date.now();
    this.stop(notification);
  }

  /**
   * @param {string|Notification} id 
   */
  resume(id) {
    const notification = this.resolve(id);

    if (!notification || !notification.pausedAt) {
      return;
    }

    const elapsed = Math.max(0, notification.pausedAt - (notification.timerAt ?? notification.pausedAt));

    notification.timerAt = Date.now() - elapsed;
    notification.pausedAt = undefined;

    this.schedule(notification);
  }

  /**
   * @private
   * @param {string|Notification} notificationOrId 
   */
  resolve(notificationOrId) {
    return notificationOrId instanceof Notification ? notificationOrId : this.get(notificationOrId);
  }

  /**
   * @private
   * @param {Notification} notification 
   */
  stop(notification) {
    if (notification.timer) {
      clearTimeout(notification.timer);
      notification.timer = undefined;
    }
  }

  /**
   * @private
   * @param {Notification} notification 
   */
  schedule(notification) {
    if (!notification.isActive || notification.loading || notification.timer || !notification.duration) {
      return;
    }

    notification.timerAt ??= Date.now();

    const duration = Math.max(0, notification.duration - (Date.now() - notification.timerAt));

    notification.timer = setTimeout(() => this.close(notification), duration);
  }

  /**
   * @private
   * @param {Notification} notification 
   * @returns {Array.<Notification>}
   */
  getList(notification) {
    return notification.status === 'queue' ? this.queue : this.list;
  }

  /**
   * @private
   */
  updateQueue() {
    const notifications = this.queue.splice(0, this.options.limit - this.list.length);

    for (const notification of notifications) {
      notification.status = 'active';
      this.list.push(notification);
      this.schedule(notification);
    }
  }
}

/**
 * @param {NotificationManager} manager 
 * @param {string} type 
 * @returns {Function}
 */
function withType(manager, type) {
  return (...args) => {
    const options = manager.parseOptions(...args);
    options.type = options.type || type;

    return manager.open.call(manager, options);
  }
}

export const ONotificationsContainer = NotificationsContainer;
export const ONotification = NotificationComp;
export const ONotificationIcon = NotificationIcon;

/**
 * @param {NotificationOptions} options 
 * @returns {{api: NotificationManager, install: Function}}
 */
export default function(options = {}) {
  const config = Object.assign({}, configDefaults, options);
  
  if (!NotificationTypes.includes(config.defaultType)) {
    config.defaultType = NotificationTypes[0];
  }

  const api = new NotificationManager(config);

  for (const type of NotificationTypes) {
    if (api[type] === undefined && type !== 'default') {
      api[type] = withType(api, type);
    }
  }

  function install(app) {
    app.config.globalProperties.$notifications = api;
    app.provide('useNotifications', () => api);

    app.component('o-notification-icon', NotificationIcon);
    app.component('o-notification-container', NotificationsContainer);
    app.component('o-notification', NotificationComp);
  }

  return {
    api,
    install,
  };
}