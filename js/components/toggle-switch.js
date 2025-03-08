import { h } from 'vue';
// import './toggle-switch.css';

export default {
  name: 'toggle-switch',
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      default: ''
    },
    modelValue: {
      type: Boolean,
      default: false
    },
  },
  computed: {
    value: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      }
    }
  },
  emits: [ 'change', 'update:modelValue' ],
  methods: {
    handleChange(ev) {
      this.$emit('change', ev);
    }
  },
  render() {
    return h('label', { class: 'toggle' }, [
      h('input', { class: 'toggle-checkbox', type: 'checkbox', checked: this.value, onChange: this.handleChange }),
      h('div', { class: 'toggle-switch' }),
      h('span', { class: 'toggle-label' }, this.label),
    ]);
  }
}