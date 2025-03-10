import { h, normalizeStyle } from 'vue';

export default {
  name: "virtual-scroller",
  props: {
    items: {
      type: Array,
      required: true
    },
    renderers: {
      default: null
    },
    itemHeight: {
      type: Number,
      default: null
    },
    typeField: {
      type: String,
      default: "type"
    },
    keyField: {
      type: String,
      default: "id"
    },
    heightField: {
      type: String,
      default: "height"
    },
    mainTag: {
      type: String,
      default: "div"
    },
    containerTag: {
      type: String,
      default: "div"
    },
    containerClass: {
      type: String,
      default: null
    },
    contentTag: {
      type: String,
      default: "div"
    },
    contentClass: {
      type: String,
      default: null
    },
    pageMode: {
      type: Boolean,
      default: false
    },
    buffer: {
      type: [Number, String],
      default: 200
    },
    poolSize: {
      type: [Number, String],
      default: 10
    },
    prerender: {
      type: [Number, String],
      default: 0
    },
    delayPreviousItems: {
      type: Boolean,
      default: false
    },
    lock: {
      type: Boolean,
      default: false
    },
  },
  data() {
    return {
      visibleItems: [],
      itemContainerStyle: null,
      itemsStyle: null,
      keysEnabled: true,
      minPoolSize: 10,
      resizeObserver: null,
      visibilityObserver: null,
      visibilityOldResult: null,
    };
  },
  emits: [ 'update', 'resize', 'visible' ],
  computed: {
    heights() {
      if (this.itemHeight === null) {
        const heights = {};
        const items = this.items;
        const field = this.heightField;
        let accumulator = 0;
        for (let i = 0; i < items.length; i++) {
          accumulator += items[i][field];
          heights[i] = accumulator;
        }
        return heights;
      }
    },
  },
  watch: {
    items: {
      handler() {
        this.updateVisibleItems(true);
      },
      deep: true
    },
    pageMode() {
      this.applyPageMode();
      this.updateVisibleItems(true);
    },
    itemHeight: "setDirty",
    lock(value) {
      if (this.$el) {
        this.$el.style.setProperty('pointer-events', value ? 'none' : 'all');
      }
    },
  },
  created() {
    this.$_ready = false;
    this.$_startIndex = 0;
    this.$_oldScrollTop = null;
    this.$_oldScrollBottom = null;
    this.$_offsetTop = 0;
    this.$_height = 0;
    this.$_scrollDirty = false;
    this.$_updateDirty = false;

    const prerender = parseInt(this.prerender);
    if (prerender > 0) {
      this.visibleItems = this.items.slice(0, prerender);
      this.$_length = this.visibleItems.length;
      this.$_endIndex = this.$_length - 1;
      this.$_skip = true;
    } else {
      this.$_endIndex = 0;
      this.$_length = 0;
      this.$_skip = false;
    }
  },
  mounted() {
    this.applyPageMode();
    this.initObservers();
    this.handleResize();

    this.$nextTick(() => {
      this.updateVisibleItems(true);
      this.$_ready = true;
    });
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
      this.visibilityObserver = null;
    }
    this.removeWindowScroll();
  },
  methods: {
    initObservers() {
      const element = this.$el;
      
      const resizeCallback = this.handleResize.bind(this);
      this.resizeObserver = new ResizeObserver(entries => {
        let entry = entries[0];
        if (entries.length > 1) {
          const sizingEntry = entries.find(e => e.target === element);
          if (sizingEntry) {
            entry = sizingEntry;
          }
        }
        resizeCallback(entry);
      });
      this.resizeObserver.observe(element);
      
      const visibilityCallback = this.handleVisibilityChange.bind(this);
      this.visibilityObserver = new IntersectionObserver(entries => {
        let entry = entries[0];

        if (entries.length > 1) {
          const intersectingEntry = entries.find(e => e.isIntersecting);
          if (intersectingEntry) {
            entry = intersectingEntry;
          }
        }

        const result = entry.isIntersecting && entry.intersectionRatio >= this.threshold;
				if (result === this.visibilityOldResult) return;
				this.visibilityOldResult = result;
				visibilityCallback(result, entry);
      });

      this.visibilityObserver.observe(element);
    },
    getScroll() {
      const el = this.$el;
      let scroll;

      if (this.pageMode) {
        const rect = el.getBoundingClientRect();
        let top = -rect.top;
        let height = window.innerHeight;
        if (top < 0) {
          height += top;
          top = 0;
        }
        if (top + height > rect.height) {
          height = rect.height - top;
        }
        scroll = {
          top: top,
          bottom: top + height
        };
      } else {
        scroll = {
          top: el.scrollTop,
          bottom: el.scrollTop + el.clientHeight
        };
      }

      if (scroll.bottom >= 0 && scroll.top <= scroll.bottom) {
        return scroll;
      } else {
        return null;
      }
    },
    updateVisibleItems(force = false) {
      if (!this.$_updateDirty) {
        this.$_updateDirty = true;

        this.$nextTick(() => {
          this.$_updateDirty = false;

          const l = this.items.length;
          const scroll = this.getScroll();
          const items = this.items;
          const itemHeight = this.itemHeight;
          let containerHeight, offsetTop;
          if (scroll) {
            let startIndex = -1;
            let endIndex = -1;

            const buffer = parseInt(this.buffer);
            const poolSize = Math.max(this.minPoolSize, parseInt(this.poolSize));
            const scrollTop = ~~(scroll.top / poolSize) * poolSize - buffer;
            const scrollBottom = Math.ceil(scroll.bottom / poolSize) * poolSize + buffer;

            if (
              !force &&
              ((scrollTop === this.$_oldScrollTop &&
                scrollBottom === this.$_oldScrollBottom) ||
                this.$_skip)
            ) {
              this.$_skip = false;
              return;
            } else {
              this.$_oldScrollTop = scrollTop;
              this.$_oldScrollBottom = scrollBottom;
            }

            // Variable height mode
            if (itemHeight === null) {
              const heights = this.heights;
              let h;
              let a = 0;
              let b = l - 1;
              let i = ~~(l / 2);
              let oldI;

              // Searching for startIndex
              do {
                oldI = i;
                h = heights[i];
                if (h < scrollTop) {
                  a = i;
                } else if (i < l && heights[i + 1] > scrollTop) {
                  b = i;
                }
                i = ~~((a + b) / 2);
              } while (i !== oldI);
              i < 0 && (i = 0);
              startIndex = i;

              // For containers style
              offsetTop = i > 0 ? heights[i - 1] : 0;
              containerHeight = heights[l - 1];

              // Searching for endIndex
              for (
                endIndex = i;
                endIndex < l && heights[endIndex] < scrollBottom;
                endIndex++
              );
              if (endIndex === -1) {
                endIndex = items.length - 1;
              } else {
                endIndex++;
                // Bounds
                endIndex > l && (endIndex = l);
              }
            } else {
              // Fixed height mode
              startIndex = ~~(scrollTop / itemHeight);
              endIndex = Math.ceil(scrollBottom / itemHeight);

              // Bounds
              startIndex < 0 && (startIndex = 0);
              endIndex > l && (endIndex = l);

              offsetTop = startIndex * itemHeight;
              containerHeight = l * itemHeight;
            }

            if (
              force ||
              this.$_startIndex !== startIndex ||
              this.$_endIndex !== endIndex ||
              this.$_offsetTop !== offsetTop ||
              this.$_height !== containerHeight ||
              this.$_length !== l
            ) {
              this.keysEnabled = !(
                startIndex > this.$_endIndex || endIndex < this.$_startIndex
              );

              this.itemContainerStyle = {
                height: containerHeight + "px"
              };
              this.itemsStyle = {
                marginTop: offsetTop + "px"
              };

              if (this.delayPreviousItems) {
                // Add next items
                this.visibleItems = items.slice(this.$_startIndex, endIndex);
                // Remove previous items
                this.$nextTick(() => {
                  this.visibleItems = items.slice(startIndex, endIndex);
                });
              } else {
                this.visibleItems = items.slice(startIndex, endIndex);
              }

              this.$emit("update", { startIndex, endIndex, offsetTop, containerHeight });

              this.$_startIndex = startIndex;
              this.$_endIndex = endIndex;
              this.$_length = l;
              this.$_offsetTop = offsetTop;
              this.$_height = containerHeight;
            }
          }
        });
      }
    },
    scrollToItem(index) {
      let scrollTop;
      if (this.itemHeight === null) {
        scrollTop = index > 0 ? this.heights[index - 1] : 0;
      } else {
        scrollTop = index * this.itemHeight;
      }
      this.$el.scrollTop = scrollTop;
    },
    setDirty() {
      this.$_oldScrollTop = null;
      this.$_oldScrollBottom = null;
    },
    applyPageMode() {
      if (this.pageMode) {
        this.addWindowScroll();
      } else {
        this.removeWindowScroll();
      }
    },
    addWindowScroll() {
      window.addEventListener("scroll", this.handleScroll, true);
      window.addEventListener("resize", this.handleResize);
    },
    removeWindowScroll() {
      window.removeEventListener("scroll", this.handleScroll, true);
      window.removeEventListener("resize", this.handleResize);
    },
    handleScroll() {
      if (!this.$_scrollDirty) {
        this.$_scrollDirty = true;
        requestAnimationFrame(() => {
          this.$_scrollDirty = false;
          this.updateVisibleItems();
        });
      }
    },
    handleResize() {
      if (this.$el && this.itemHeight) {
        const rect = this.$el.getBoundingClientRect();
        this.minPoolSize = Math.ceil(rect.height / this.itemHeight);
      }

      this.$emit("resize", { target: this.$el });
      this.$_ready && this.updateVisibleItems();
    },
    handleVisibilityChange(isVisible, entry) {
      if (
        this.$_ready &&
        (isVisible ||
          entry.boundingClientRect.width !== 0 ||
          entry.boundingClientRect.height !== 0)
      ) {
        this.$emit("visible", { isVisible, entry });
        this.$nextTick(() => {
          this.updateVisibleItems();
        });
      }
    },
  },
  render() {
    const defaultSlot = this.$slots.default || (() => null);

    const items = h(this.contentTag, {
      ref: 'items',
      class: [ 'items', this.contentClass ],
      style: normalizeStyle(this.itemsStyle)
    }, [
      this.$slots.beforeItems?.(),
      ...(this.renderers ? 
        this.visibleItems.map((item, index) => h(this.renderers[item[this.typeField]], {
          key: index,
          item, 
          itemIndex: this.$_startIndex + index
        })) : 
        this.visibleItems.map((item, index) => defaultSlot({
          item, 
          itemIndex: this.$_startIndex + index,
          itemKey: this.keysEnabled && item[this.keyField] || '',
        })))
    ]);

    const itemContainer = h(this.containerTag, {
      ref: 'itemContainer',
      class: [ 'item-container', this.containerClass ],
      style: normalizeStyle(this.itemContainerStyle)
    }, [
      this.$slots.beforeContent?.(),
      items,
      this.$slots.afterContent?.(),
    ]);

    return h(this.mainTag, {
      class: { 'virtual-scroller': true, 'page-mode': this.pageMode },
      onScroll: this.handleScroll
    }, [
      this.$slots.beforeContainer?.(),
      itemContainer,
      this.$slots.afterContainer?.()
    ]);
  }
}