import { h } from 'vue';
import DialogModal from './dialog-modal.js';
import TextField from './text-field.js';
import Button from './button.js';

export default {
  name: 'new-folder-dialog',
  components: {
    DialogModal,
    TextField,
    Button
  },
  props: {
    open: Boolean,
  },
  emits: [ 'show', 'submited' ],
  data() {
    return {
      value: '',
    };
  },
  inject: [ 'fetchApi', 'getCurrentDir' ],
  methods: {
    handleTextChange(ev) {
      this.value = ev.target.value;
    },
    handleDialogShow(val) {
      this.$emit('show', val);
    },
    handleDialogClose() {
      this.value = '';
    },
    async handleSubmit(ev) {
      try {
        const dir = this.getCurrentDir();
        const res = await this.fetchApi('post', 'mkdir', dir, this.value);

        if (res.success == true) {
          this.$emit('submited', res.results, ev);
          this.$refs.dialog.closeModal();

        } else {
          const err = new Error(res.eror.msg);
          err.code = res.eror.code;
          throw err;
        }
      } catch(e) {
        console.error(e);
        
        if (this.$refs.input) {
          this.$refs.input.helperText = e.message;
        }
      }
    },
  },
  render() {
    return h(DialogModal, { ref: 'dialog', modelValue: this.open, width: '20em', onShow: this.handleDialogShow, onClose: this.handleDialogClose }, {
      default: () => h('div', { class: 'dialog-content' }, [
        h('div', { class: 'dialog-body' }, 
          h(TextField, { ref: 'input', label: this.$t('Enter folder name'), modelValue: this.value, onChange: this.handleTextChange })
        ),
        h('div', { class: 'dialog-footer' }, [
          h(Button, { variant: 'secondary', 'aria-label': 'close', 'formmethod': 'dialog' }, () => this.$t('Cancel')),
          h(Button, { onClick: this.handleSubmit }, () => this.$t('OK')),
        ]),
      ]),
    });
  }
}