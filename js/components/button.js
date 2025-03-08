import { h } from 'vue';
// import './button.css';

export default {
  name: 'material-button',
  props: {
    title: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'button',
      validator: v => !!~['button', 'reset', 'submit', 'toggle'].indexOf(v),
    },
    variant: {
      type: String,
      default: 'primary',
      validator: v => !!~['primary', 'secondary', 'flat', 'actions'].indexOf(v),
    },
    elevation: {
      type: Number,
      default: 2,
      validator: v => !!~[2, 3, 4, 6, 8, 16].indexOf(v),
    },
    minWidth: Boolean,
    modelValue: {
      type: Boolean,
      default: false
    },
  },
  emits: [ 'click', 'change', 'update:modelValue' ],
  computed: {
    checked: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      }
    }
  },
  methods: {
    handleClick(ev) {
      this.$emit('click', ev);
    },
    handleChange(ev) {
      this.$emit('change', ev);
    },
  },
  render() {
    const defaultSlot = typeof this.$slots === 'function' ? this.$slots : typeof this.$slots.default === 'function' ? this.$slots.default : (() => null);
    const elevation = ['flat', 'actions'].includes(this.variant) ? '' : `elevation-${this.elevation}`;
    const btnClass = `btn btn-${this.variant} ${elevation} ${this.minWidth ? 'min-width' : ''}`;

    if (this.type == 'toggle') {
      return h('label', { title: this.title, class: btnClass, style: { position: 'relative' } }, [
        h('input', { type: 'checkbox', checked: this.checked, style: { position: 'absolute', opacity: 0, top: 0, left: 0, zIndex: -1 }, onchange: this.handleChange }),
        defaultSlot({ checked: this.checked })
      ]);
    }

    return h('button', { type: this.type, title: this.title, class: btnClass, onclick: this.handleClick }, defaultSlot());
  }
}