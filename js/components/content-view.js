import { h } from 'vue';
import PlaceholderEmpty from './placeholder-empty.js';
import VirtualTable from './virtual-table.js';
import ModuleList from './module-list.js';
import SvgIcon from './svg-icon.js';
import { MenuFlyout, MenuItem, MenuSeparator } from './menu.js';
import { contentTypeToIcon, formatTimestamp, formatFileSize, filelistComparator } from '../lib/utils.js';

export default {
  name: 'content-view',
  components: {
    VirtualTable,
    ModuleList,
    PlaceholderEmpty,
    SvgIcon,
    MenuFlyout,
    MenuItem,
    MenuSeparator,
  },
  props: {
    items: {
      type: Array,
      default: []
    },
    sort: {
      type: String,
      default: 'name',
      validator: v => !!~['name', 'size', 'type', 'mtime'].indexOf(v),
    },
    view: {
      type: String,
      default: 'headline',
      validator: v => !!~['headline', 'list', 'module'].indexOf(v),
    },
    isWritable: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    tableColumns() {
      return [
        { dataKey: 'name', header: this.$t('Name'), width: 500, cellType: 'text', cellAlignment: 'left' },
        { dataKey: 'size', header: this.$t('Size'), width: 200, cellType: 'text', cellAlignment: 'right' },
        { dataKey: 'type', header: this.$t('Type'), width: 250, cellType: 'text', cellAlignment: 'left' },
        { dataKey: 'dateModified', header: this.$t('Date modified'), width: 200, cellType: 'text', cellAlignment: 'left' },
      ];
    },
  },
  watch: {
    items: {
      handler: function() {
        this.populateTableData();
      },
      deep: true
    },
    sort() {
      this.populateTableData();
    },
  },
  emits: [ 'openFolder', 'itemLongPress' ],
  data() {
    return {
      tableData: [],
      activeItem: null,
      lockContent: false,
    };
  },
  methods: {
    populateTableData() {
      if (this.items.length == 0) {
        this.tableData = [];

      } else {
        const folders = this.items.filter(x => x.isDir).sort(filelistComparator(this.sort));
        const files = this.items.filter(x => !x.isDir).sort(filelistComparator(this.sort));

        this.tableData = folders.concat(files).map((f) => {
          return {
            ...f,
            name: f.name,
            path: f.path.replace(/^\//, ''),
            size: f.isDir ? '—' : formatFileSize(f.size),
            type: f.isDir ? this.$t('Folder') : f.contentType,
            dateModified: formatTimestamp(f.mtime),
          };
        });
      }
    },
    handleRowDblClick(props, ev) {
      if (props.row.isDir) {
        ev.preventDefault();
        ev.stopPropagation();

        this.$emit('openFolder', props, ev);
      } else {
        //
      }
    },
    handleRowLongPress(props, ev) {
      this.$emit('itemLongPress', props, ev);
    },
    handleRowContextMenu(props, ev) {
      if (ev.target.nodeName !== 'A' && this.$refs.contextMenu) {
        ev.preventDefault();
        this.activeItem = props.row;
        this.$refs.contextMenu.show();
      }
    },
    handleShowContextMenu(show) {
      this.lockContent = show;
    },
    handleContextMenuClick(item) {
      return (ev) => {};
    }
  },
  render() {
    let fileView = null;
    if (this.view == 'headline') {
      fileView = h(VirtualTable, { 
        ref: 'fileTable', 
        columns: this.tableColumns, 
        source: this.tableData, 
        headerHeight: 40, 
        rowHeight: 48, 
        lock: this.lockContent,
        onRowDblClick: this.handleRowDblClick,
        onRowLongPress: this.handleRowLongPress,
        onRowContextMenu: this.handleRowContextMenu,
      }, {
        empty: () => h(PlaceholderEmpty),
        cell: (cell, i) => {
          if (cell.dataKey == 'name') {
            if (cell.item.isDir) {
              return [
                h(SvgIcon, { key: `icon-folder-${i}`, type: 'filesIcons', d: 'folder', size: 24 }),
                h('span', { key: `folder-${i}`, class: 'list-name' }, cell.content)
              ];
            } else {
              const icon = contentTypeToIcon(cell.item.contentType, cell.item.ext);
              return [
                h(SvgIcon, { key: `icon-${icon}-${i}`, type: 'filesIcons', d: icon, size: 24 }),
                h('a', { key: `text-${i}`, href: cell.item.path, target: '_blank', class: 'list-name' }, `${cell.content}`)
              ];
            }
          } 
          
          return h('span', { key: `text-${i}`, class: `list-${cell.dataKey}` }, cell.content);
        }
      });
      
    } else if (this.view == 'module') {
      fileView = h(ModuleList, {
        items: this.tableData,
        lock: this.lockContent,
        onItemDblClick: this.handleRowDblClick,
        onItemContextMenu: this.handleRowContextMenu,
      }, {
        empty: () => h(PlaceholderEmpty)
      });
    }

    return [
      h('div', { class: 'main-content' }, fileView),
      h(MenuFlyout, { ref: 'contextMenu', onShow: this.handleShowContextMenu }, {
        default: () => [
          h(MenuItem, { key: 'ctx-menu-download', label: this.$t('Download…'), icon: 'file-download', onClick: this.handleContextMenuClick('download') }),
          h(MenuSeparator, {}),
          h(MenuItem, { key: 'ctx-menu-rename', label: this.$t('Rename'), icon: 'form-textbox', disabled: !this.isWritable, onClick: this.handleContextMenuClick('rename') }),
          h(MenuItem, { key: 'ctx-menu-delete', label: this.$t('Delete'), icon: 'delete', disabled: !this.activeItem?.isDeleteable, onClick: this.handleContextMenuClick('delete') }),
          h(MenuItem, { key: 'ctx-menu-copy', label: this.$t('Copy'), icon: 'copy', disabled: !this.isWritable, onClick: this.handleContextMenuClick('copy') }),
          h(MenuItem, { key: 'ctx-menu-cut', label: this.$t('Cut'), icon: 'cut', disabled: !this.isWritable, onClick: this.handleContextMenuClick('cut') }),
          h(MenuSeparator, {}),
          h(MenuItem, { key: 'ctx-menu-properties', icon: '-', label: this.$t('Properties…'), onClick: this.handleContextMenuClick('properties') }),
        ]
      }),
    ];
  }
};