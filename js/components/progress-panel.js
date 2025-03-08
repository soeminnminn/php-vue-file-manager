import { h } from 'vue';
import SvgIcon from './svg-icon.js';
import Button from './button.js';

export default {
  name: 'progress-panel',
  components: {
    SvgIcon,
    Button,
  },
  props: {
    show: Boolean,
    progress: {
      type: [Number, Boolean],
      default: false
    },
    title: String,
    message: String,
    iconType: {
      type: String,
      default: 'filesIcons'
    },
    icon: {
      type: String,
      default: 'folder'
    },
    actionType: {
      type: String,
      default: '',
      validator: v => !!~['', 'action', 'close', 'delete', 'paste'].indexOf(v),
    },
    actionIcon: String,
  },
  computed: {
    shown: {
      get() {
        return this.show;
      },
      set(value) {
        this.$emit('show', value);
      }
    },
    hasAction() {
      return this.actionType && this.actionIcon;
    },
  },
  emits: [ 'show', 'actionClick' ],
  methods: {
    handleActionClick(ev) {
      if (this.actionType == 'close') {
        this.shown = false;
      } else {
        this.$emit('actionClick', this.actionType, ev);
      }
    },
  },
  render() {
    let progress = undefined;

    if (this.shown && this.progress) {
      if (this.progress === true) {
        progress = h('div', { class: 'panel-progress indeterminate' },
          h('div', { class: 'panel-progress-bar' })
        );

      } else if (typeof this.progress === 'number') {
        const p = Math.max(0, Math.min(100, this.progress)).toFixed();
        
        progress = h('div', { class: 'panel-progress' },
          h('div', { class: 'panel-progress-bar', style: { width: `${p}%` } })
        );
      }
    }

    return this.shown && h('div', { class: 'progress-panel' }, [
      h('div', { class: 'panel-icon' }, 
        h(SvgIcon, { size: 40, type: this.iconType, d: this.icon })
      ),
      h('div', { class: 'panel-content' }, [
        this.title && h('span', { class: 'panel-title' }, this.title),
        this.message && h('span', { class: 'panel-message' }, this.message),
        progress,
      ]),
      h('div', { class: 'panel-actions' }, 
        this.hasAction && h(Button, { variant: 'secondary', minWidth: true, onclick: this.handleActionClick }, 
          h(SvgIcon, { size: 20, type: 'toolbarIcons', d: this.actionIcon })
        )
      ),
    ]);
  }
};