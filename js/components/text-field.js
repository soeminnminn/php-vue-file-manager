import { h } from 'vue';
// import './text-field.css';

// https://codepen.io/tkoleary/pen/NWPBZgB
export default {
  name: 'text-field',
  inheritAttrs: false,
  props: {
    type: {
      type: String,
      default: 'text',
      validator: v => !!~["date", "datetime-local", "month", "time", "week", "file", "email", "number", "password", "search", "tel", "text", "url"].indexOf(v),
    },
    label: {
      type: String,
      default: ''
    },
    helperText: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    modelValue: {
      required: true
    },
    pattern: {
      type: String,
      required: false
    },
    readOnly: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
  },
  emits: [ 'update:modelValue', 'change' ],
  computed: {
    value: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      }
    },
    hasValue() {
      return !!this.value;
    },
  },
  methods: {
    handleChange(ev) {
      this.value = ev.target.value;
      this.$emit('change', ev);
    },
  },
  render() {
    return h('div', {
      class: {
        'text-field': true, 
        'valid': this.hasValue
      },
    }, [
      h('input', { 
        type: this.type, 
        required: this.required, 
        readOnly: this.readOnly, 
        disabled: this.disabled,
        pattern: this.pattern,
        value: this.value, 
        onchange: this.handleChange 
      }),
      h('span', { class: 'bar' }),
      h('label', {}, this.label),
      h('span', {}, this.helperText)
    ]);
  }
}
