import { h } from 'vue';
import Popper from 'popper';
// import './popper-popup.css';

export default {
  name: 'popper-popup',
  props: {
    title: {
      type: String,
      default: 'Menu'
    },
    width: {
      type: String,
      default: '5em'
    },
    buttonClass: {
      type: String,
      default: ''
    },
  },
  data() {
    return {
      popperInstance: null
    };
  },
  methods: {
    createInstance() {
      if (!this.$refs.popperButton || !this.$refs.popperPopup) return;
      this.popperInstance = Popper.createPopper(this.$refs.popperButton, this.$refs.popperPopup, {
        placement: 'bottom', //preferred placement of popper
        modifiers: [
          {
            name: 'offset', //offsets popper from the reference/button
            options: {
              offset: [0, 2]
            }
          },
          {
            name: 'flip', //flips popper with allowed placements
            options: {
              allowedAutoPlacements: ['bottom', 'top', 'right', 'left'],
              rootBoundary: 'viewport'
            }
          }
        ]
      });
    },
    destroyInstance() {
      if (this.popperInstance) {
        this.popperInstance.destroy();
        this.popperInstance = null;
      }
    },
    showPopper() {
      if (!this.$refs.popperPopup) return;
      this.$refs.popperPopup.setAttribute('show-popper', '');
      this.createInstance();
    },
    hidePopper() {
      if (!this.$refs.popperPopup) return;
      this.$refs.popperPopup.removeAttribute('show-popper');
      this.destroyInstance();
    },
    togglePopper() {
      if (!this.$refs.popperPopup) return;
      if (this.$refs.popperPopup.hasAttribute('show-popper')) {
        this.hidePopper();
      } else {
        this.showPopper();
      }
    },
    onClick(ev) {
      ev.preventDefault();
      this.togglePopper();
    },
    escClose(ev) {
      if (ev.keyCode === 27) {
        this.hidePopper();
      }
    },
    closeMenu(ev) {
      if (!ev || (ev && !this.$el.contains(ev.target))) {
        this.hidePopper();
      }
    },
  },
  mounted() {
    document.addEventListener('pointerdown', this.closeMenu);
    document.addEventListener('keydown.popper', this.escClose);
  },
  beforeUnmount() {
    document.removeEventListener('keydown.popper', this.escClose);
    document.removeEventListener('pointerdown', this.closeMenu);
  },
  render() {
    const defaultSlot = typeof this.$slots === 'function' ? this.$slots : typeof this.$slots.default === 'function' ? this.$slots.default : (() => null);
    const popperSlot = typeof this.$slots.popper === 'function' ? this.$slots.popper : (() => this.title);

    return h('section', { class: 'popper-section' }, [
      h('button', { ref: 'popperButton', type: 'button', title: this.title, class: `popper-button ${this.buttonClass}`, 
        onclick: (e) => this.onClick(e) }, popperSlot()),
      h('div', { ref: 'popperPopup', class: 'popper-popup', style: `width: ${this.width}` }, 
        h('div', { class: 'popper-body' }, defaultSlot())
      ),
    ]);
  }
}