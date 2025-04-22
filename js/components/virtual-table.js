import { defineComponent, h } from 'vue';
import VirtualScroller from './virtual-scroller.js';
// import './virtual-table.css';

function parseEmPx(emPx, isEm = false) {
  if (typeof emPx === 'string') {
    emPx = emPx.trim();
    const matches = /^([\d\.]+)(em|rem|px)$/i.exec(emPx);
    if (matches) {
      if (String(matches[2]).toLocaleLowerCase() == 'px') {
        return Math.round(parseFloat(matches[1]));
      } else {
        const em = Math.round(parseFloat(matches[1]) * 100) / 100;
        return em * 16;
      }
    }
  } else if (typeof emPx === 'number') {
    return emPx * (isEm ? 16 : 1);
  }
  return NaN;
}

const DEF_ROW_HEIGHT = parseEmPx(2, true); // px of 2em
const MIN_COL_WIDTH = parseEmPx(2, true); // px of 2em
const PRESS_DURATION = 2000;

const alignments = ['start', 'left', 'center', 'end', 'right'];
const cellTypes = ['text', 'html'];

const VTHeader = defineComponent({
  props: {
    modelValue: {
      type: Number,
      default: 30,
    },
    resizable: {
      type: Boolean,
      default: true,
    },
    alignment: {
      type: String,
      default: 'center',
      validator: v => !!~alignments.indexOf(v),
    },
    sorting: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      origX: 0,
      origWidth: 0,
      newWidth: 0,
    };
  },
  emits: ['update:modelValue', 'input'],
  computed: {
    value: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
        this.$emit('input', value);
      }
    },
  },
  methods: {
    handlePointerDown(event) {
      this.origWidth = this.modelValue;
      this.origX = event.pageX !== undefined ? event.pageX - window.pageXOffset : event.clientX;

      document.addEventListener('pointermove', this.handlePointerMove);
      document.addEventListener('pointerup', this.handlePointerUp);
      document.addEventListener('pointercancel', this.handlePointerUp);
    },
    handlePointerMove(event) {
      if (this.origWidth) {
        const clientX = event.pageX !== undefined ? event.pageX - window.pageXOffset : event.clientX;
        const xDif = clientX - this.origX;
        this.value = Math.max(MIN_COL_WIDTH, (xDif > 0) ? this.origWidth + xDif : this.origWidth - Math.abs(xDif));
      }
    },
    handlePointerUp() {
      this.origWidth = 0;

      document.removeEventListener('pointermove', this.handlePointerMove);
      document.removeEventListener('pointerup', this.handlePointerUp);
      document.removeEventListener('pointercancel', this.handlePointerUp);
    }
  },
  render() {
    const defaultSlot = this.$slots.default || (() => { });
    return h('div', { class: ['vt-column', this.sorting && `sorting-${this.sorting}`], style: { 'width': `${this.value}px` } }, [
      h('div', { class: 'vt-header', style: { 'text-align': this.alignment } }, defaultSlot()),
      this.resizable && h('div', { class: 'vt-divider', onPointerdown: (e) => this.handlePointerDown(e) }, '')
    ]);
  },
});

export default {
  components: {
    VirtualScroller,
    VTHeader,
  },
  props: {
    columns: {
      type: [Array, Object],
      required: true
    },
    source: {
      type: Array,
      required: true
    },
    headerHeight: {
      type: [Number, String],
      default: DEF_ROW_HEIGHT,
    },
    rowHeight: {
      type: [Number, String],
      default: DEF_ROW_HEIGHT,
    },
    lock: {
      type: Boolean,
      default: false
    },
  },
  data() {
    return {
      innerHeight: 100,
      columnWidths: [],
      rowPressTimer: null,
      activeRow: -1,
    };
  },
  computed: {
    headers() {
      if (typeof this.columns === 'object') {
        const cols = Array.isArray(this.columns) ? this.columns : Object.keys(this.columns).map(k => {
          return {
            ...this.columns[k],
            dataKey: k,
          };
        });

        return cols.map((x, i) => {
          if (!this.columnWidths[i]) {
            this.columnWidths[i] = Math.max(x.width || 0, MIN_COL_WIDTH);
          }
          return {
            header: x.header,
            width: this.columnWidths[i],
            alignment: alignments.includes(x.alignment) ? x.alignment : 'center',
            cellAlignment: alignments.includes(x.cellAlignment) ? x.cellAlignment : 'left',
            cellType: cellTypes.includes(x.cellType) ? x.cellType : 'text',
            resizable: typeof x.resizable === 'undefined' ? true : !!x.resizable,
            sorting: '',
            dataKey: x.dataKey,
          };
        });
      }
      return [];
    },
    itemsData() {
      const cols = this.headers;

      return this.source.map((row, r) => {
        return {
          index: r,
          row,
          cells: cols.map((col, c) => {
            const content = row[col.dataKey];
            return {
              dataKey: col.dataKey,
              content,
              cellType: col.cellType,
              alignment: col.cellAlignment,
              width: this.columnWidths[c],
              item: row,
            };
          }),
        };
      });
    },
    totalWidth() {
      return this.columnWidths.reduce((t, x) => {
        t += x;
        return t;
      }, 0);
    },
    headerHeightPx() {
      if (this.headerHeight) {
        const val = parseEmPx(this.headerHeight);
        if (!isNaN(val)) return `${val}px`;
      }
      return `${DEF_ROW_HEIGHT}px`;
    },
    rowHeightPx() {
      if (this.rowHeight) {
        const val = parseEmPx(this.rowHeight);
        if (!isNaN(val)) return val;
      }
      return DEF_ROW_HEIGHT;
    },
  },
  emit: [ 'rowClick', 'rowDblClick', 'rowLongPress', 'rowContextMenu' ],
  mounted() {
    document.addEventListener('pointerup', this.handleDocPointerUp);
  },
  beforeUnmount() {
    document.removeEventListener('pointerup', this.handleDocPointerUp);

    if (this.rowPressTimer !== null) {
      clearTimeout(this.rowPressTimer);
      this.rowPressTimer = null;
    }
  },
  methods: {
    updateSource(force = false) {
      if (this.$refs.scroller) {
        this.$refs.scroller.updateVisibleItems(force);
      }
    },
    handleResize(ev) {
      const target = ev.target;
      this.innerHeight = target.clientHeight;
    },
    handleRowClick(props) {
      return (ev) => {
        this.$emit('rowClick', props.item, ev);
      };
    },
    handleRowDblClick(props) {
      return (ev) => {
        this.$emit('rowDblClick', props.item, ev);
      };
    },
    handleRowPointerDown(props) {
      return (ev) => {
        this.activeRow = this.activeRow == props.itemIndex ? -1 : props.itemIndex;

        this.rowPressTimer = setTimeout(() => {
          this.$emit('rowLongPress', props.item, ev);
        }, PRESS_DURATION);
      };
    },
    handleDocPointerUp() {
      if (this.rowPressTimer !== null) {
        clearTimeout(this.rowPressTimer);
        this.rowPressTimer = null;
      }
    },
    handleRowContextMenu(props) {
      return (e) => {
        this.activeRow = props.itemIndex;
        
        this.$emit('rowContextMenu', props.item, e);
      };
    },
  },
  render() {
    const emptySlot = this.$slots.empty || (() => h('div', { class: 'vt-empty-message', style: { width: `${this.totalWidth}px`, top: `${this.headerHeightPx}px` } }, 
      'Nothing to see here…'
    ));

    const cellSlot = typeof this.$slots.cell === 'function' ? 
      ((cell, ic, cells) => h('div', { key: `vt-cell-${ic}`, class: 'vt-cell', style: { width: `${cell.width}px` } }, 
        this.$slots.cell(cell, ic, cells)
      )) : 
      ((cell, ic) => {
        if (cell.cellType == 'html') {
          return h('div', { key: `vt-cell-${ic}`, class: 'vt-cell', style: { width: `${cell.width}px` }, innerHTML: cell.content });
        }
        
        return h('div', { key: `vt-cell-${ic}`, class: 'vt-cell', style: { width: `${cell.width}px` } }, 
          h('div', { class: 'vt-cell-content', style: { textAlign: `${cell.alignment}` } }, cell.content)
        );
      }); 

    return h('div', { class: 'vt-table' },
      h(VirtualScroller, {
        ref: 'scroller',
        class: 'vt-scroller',
        items: this.itemsData,
        itemHeight: this.rowHeightPx,
        contentTag: 'div',
        lock: this.lock,
        onResize: this.handleResize,
      }, {
        beforeContainer: () => h('div', { class: 'vt-head', style: { width: `${this.totalWidth}px`, height: `${this.headerHeightPx}px` } }, 
          this.headers.map((col, ic) => h(VTHeader, {
            modelValue: this.columnWidths[ic],
            alignment: col.alignment,
            resizable: col.resizable,
            sorting: col.sorting,
            onInput: ((w) => this.columnWidths[ic] = w),
          }, {
            default: () => col.header
          }))
        ),
        afterContainer: () => (!this.itemsData.length) && emptySlot(),
        default: (props) => h('div', { 
          class: {'vt-row': true, 'vt-active': this.activeRow == props.itemIndex}, 
          style: { width: `${this.totalWidth}px`, height: `${this.rowHeightPx}px` }, 
          onclick: this.handleRowClick(props),
          ondblclick: this.handleRowDblClick(props),
          onpointerdown: this.handleRowPointerDown(props),
          oncontextmenu: this.handleRowContextMenu(props),
        }, 
          props.item.cells.map(cellSlot)
        ),
      })
    );
  }
}