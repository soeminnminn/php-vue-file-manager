import { h, withDirectives, vShow, Transition } from 'vue';
// import './dialog-modal.css';

export default {
  name: 'dialog-modal',
  components: {
    Transition
  },
  props: {
    modelValue: Boolean,
    width: [Number, String],
  },
  emits: ['show', 'update:modelValue', 'close'],
  computed: {
    value: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
        this.$emit('show', value);
      }
    }
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.$nextTick(this.bindModalClose);
      }
    },
  },
  methods: {
    bindModalClose() {
      if (this.$el) {
        const closeEls = this.$el.querySelectorAll('[formmethod="dialog"]');
        if (closeEls && closeEls.length) {
          const closeFn = () => { this.value = false; };
          closeEls.forEach(el => {
            el.addEventListener('click', closeFn);
          });
        }
      }
    },
    haneleBeforeEnter() {
      if (this.$el) {
        this.$el.showModal();
      }
    },
    handleAfterLeave() {
      if (this.$el) {
        this.$el.close();
      }
    },
    handleClose(ev) {
      this.$emit('close', ev);
      this.$nextTick(() => {
        this.value = false;
      });
    },
    handleClickOutSide(ev) {
      const x = ev.clientX;
      const y = ev.clientY;

      const { left, right, top, bottom } = this.$el.getBoundingClientRect();
      if (x < left || x > right || y < top || y > bottom) {
        this.value = false;
      }
    },
    openModal() {
      this.value = true;
    },
    closeModal() {
      this.value = false;
    },
  },
  render() {
    const defaultSlot = typeof this.$slots === 'function' ? this.$slots : typeof this.$slots.default === 'function' ? this.$slots.default : (() => null);

    const width = this.width ? (typeof this.width === 'number' ? `${this.width}px` : this.width) : 'unset';

    const dialog = h('dialog', {
      class: 'dialog-modal',
      role: 'dialog',
      style: { width },
      onclick: this.handleClickOutSide,
      onclose: this.handleClose,
    }, defaultSlot());

    return h(Transition, {
      name: 'dialog',
      onBeforeEnter: this.haneleBeforeEnter,
      onAfterLeave: this.handleAfterLeave,
    }, {
      default: () => withDirectives(dialog, [ [vShow, this.value] ])
    });
  }
}