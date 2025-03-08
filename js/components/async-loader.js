import { h } from 'vue';
// import './async-loader.css';

// https://github.com/ajomuch92/vue-suspense
export default {
  name: "async-loader",
  props: {
    modelValue: {
      default: undefined,
    },
    promise: {
      type: [Promise, Function],
      required: true,
    },
    tag: {
      type: String,
      default: "div",
    },
    loadOnStart: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      loadingData: false,
      hasError: false,
      error: undefined,
    };
  },
  computed: {
    value: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      }
    },
  },
  emits: [ 'update:modelValue', 'loaded', 'error' ],
  mounted() {
    if (this.loadOnStart) {
      this.loadData();
    }
  },
  methods: {
    async loadData(...args) {
      this.loadingData = true;
      
      let results = undefined;
      try {
        if (typeof this.promise === 'function') {
          results = await this.promise(...args);
        } else if (this.promise instanceof Promise) {
          results = await this.promise;
        }
        this.$emit('loaded', results);

      } catch (err) {
        this.error = err;
        this.hasError = true;
        this.$emit('error', err);

      } finally {
        this.loadingData = false;
      }

      this.value = results;
      return results;
    },
  },
  render() {
    let children = null;

    if (this.loadingData) {
      if (typeof this.$slots.loading === 'function') {
        children = h('div', { class: 'loading-container' }, this.$slots.loading());  
      } else {
        children = h('div', { class: 'loading-container-fixed' }, 
            h('div', { class: 'progress-container' }, 
            h('div', { class: 'progress-bar' }, 
              h('div', { class: 'progress-bar-value' })
            )
          )
        );
      }

    } else if (this.hasError) {
      const errorSlot = typeof this.$slots.error === 'function' ? this.$slots.error : ((err) => err.message || String(err));
      children = errorSlot(this.error);

    } else {
      const defaultSlot = typeof this.$slots.default === 'function' ? this.$slots.default : (() => null);
      children = defaultSlot(this.value);
    }
    return h(this.tag, { class: 'async-loader' }, children);
  }
}