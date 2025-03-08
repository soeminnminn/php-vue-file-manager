import { h, defineComponent } from 'vue';
import Button from './button.js';
import SvgIcon from './svg-icon.js';
import PopperPopup from './popper-popup.js';
import Breadcrumb from './breadcrumb.js';
import { MenuContent, MenuItem, FilePickerMenuItem } from './menu.js';
// import './navbar.css';

const SortMenu = defineComponent({
  name: 'sort-menu',
  components: {
    MenuContent,
    MenuItem
  },
  props: {
    sort: {
      typs: String,
      default: 'name',
      validator: v => !!~["name", "size", "type", "mtime"].indexOf(v),
    },
  },
  emit: [ 'itemClick' ],
  methods: {
    handleItemClick(item) {
      return (ev) => {
        this.$emit('itemClick', item, ev);
      };
    },
  },
  render() {
    return h(MenuContent, {}, () => [
      h(MenuItem, { key: 'sort-menu-name', label: this.$t('Name'), checked: this.sort == 'name', onClick: this.handleItemClick('name') }),
      h(MenuItem, { key: 'sort-menu-size', label: this.$t('Size'), checked: this.sort == 'size', onClick: this.handleItemClick('size') }),
      h(MenuItem, { key: 'sort-menu-type', label: this.$t('Type'), checked: this.sort == 'type', onClick: this.handleItemClick('type') }),
      h(MenuItem, { key: 'sort-menu-mtime', label: this.$t('Date modified'), checked: this.sort == 'mtime', onClick: this.handleItemClick('mtime') }),
    ]);
  }
});

const MoreMenu = defineComponent({
  name: 'more-menu',
  components: {
    MenuContent,
    MenuItem
  },
  props: {
    isWritable: {
      type: Boolean,
      default: true,
    },
  },
  emit: [ 'itemClick', 'itemSelectChange' ],
  methods: {
    handleItemClick(item) {
      return (ev) => {
        this.$emit('itemClick', item, ev);
      };
    },
    handleItemSelectChange(item) {
      return (ev) => {
        this.$emit('itemSelectChange', item, ev);
      };
    },
  },
  render() {
    return h(MenuContent, {}, () => [
      h(MenuItem, { label: this.$t('New folder…'), icon: 'create-new-folder', disabled: !this.isWritable, onClick: this.handleItemClick('newFolder') }),
      h(FilePickerMenuItem, { label: this.$t('Upload…'), icon: 'cloud-upload', disabled: !this.isWritable, onClick: this.handleItemClick('upload'), onChange: this.handleItemSelectChange('upload') }),
    ]);
  }
});

export default {
  name: 'nav-bar',
  components: {
    Button,
    SvgIcon,
    Breadcrumb,
    PopperPopup,
    SortMenu,
    MoreMenu
  },
  props: {
    isWritable: {
      type: Boolean,
      default: true,
    },
    sort: {
      type: String,
      default: 'name',
      validator: v => !!~['name', 'size', 'type', 'mtime'].indexOf(v),
    },
    currentDir: {
      type: String,
      default: '/'
    }
  },
  data() {
    return {
      isViewList: false,
    };
  },
  emit: [ 'viewChange', 'searchClick', 'reloadClick', 'sortItemClick', 'moreItemClick' ],
  methods: {
    handleSortItemClick(item, ev) {
      this.$emit('sortItemClick', item, ev);

      if (this.$refs.sortMenuRef) {
        this.$refs.sortMenuRef.hidePopper();
      }
    },
    handleMoreItemClick(item, ev) {
      this.$emit('moreItemClick', item, ev);

      if (this.$refs.moreMenuRef) {
        this.$refs.moreMenuRef.hidePopper();
      }
    },
    handleViewModeChange() {
      this.isViewList = !this.isViewList;
      this.$emit('viewChange', this.isViewList ? 'module' : 'headline');
    },
    handleSearchClick(ev) {
      this.$notifications.open('Not implemented', {
        title: this.$t('APP_NAME'),
        icon: 'warning',
        type: 'warning',
      });

      this.$emit('searchClick', ev);
    },
    handleReloadClick(ev) {
      this.$emit('reloadClick', ev);
    },
    handleItemSelectChange(item, ev) {
      if (item == 'upload') {
        console.dir(ev.target.files);
      }
    },
  },
  render() {
    return h('nav', { class: 'navbar navbar-fixed' },
      h('div', { class: 'navbar-content' }, [
        h('div', { class: 'navbar-brand' }, 
          h(Breadcrumb, { appName: this.$t('APP_NAME'), currentDir: this.currentDir })
        ),
        h('div', { class: 'navbar-actions' }, [
          h(Button, { key: 'nav-search-menu', title: this.$t('Search'), variant: 'actions', onClick: this.handleSearchClick }, {
            default: () => {
              return h(SvgIcon, { type: 'toolbarIcons', d: 'search', size: 24 });
            }
          }),
          h(Button, { key: 'nav-reload-menu', title: this.$t('Reload'), variant: 'actions', onClick: this.handleReloadClick }, {
            default: () => {
              return h(SvgIcon, { type: 'toolbarIcons', d: 'refresh', size: 24 });
            }
          }),
          h(Button, { key: 'nav-view-menu', title: this.$t('View'), type: 'toggle', variant: 'actions', modelValue: this.isViewList, onChange: this.handleViewModeChange }, {
            default: ({ checked }) => {
              return checked ? 
                h(SvgIcon, { key: 'view-headline', type: 'toolbarIcons', d: 'view-headline', size: 24 }) : 
                h(SvgIcon, { key: 'view-module', type: 'toolbarIcons', d: 'view-module', size: 24 });
            }
          }),
          h(PopperPopup, { key: 'nav-sort-menu', ref: 'sortMenuRef', title: this.$t('Sort'), buttonClass: 'btn btn-actions', width: '10em' }, {
            popper: () => h(SvgIcon, { type: 'toolbarIcons', d: 'sort', size: 24 }),
            default: () => h(SortMenu, { sort: this.sort, onItemClick: this.handleSortItemClick })
          }),
          h(PopperPopup, { key: 'nav-more-menu', ref: 'moreMenuRef', title: this.$t('Menu'), buttonClass: 'btn btn-actions', width: '10em' }, {
            popper: () => h(SvgIcon, { type: 'toolbarIcons', d: 'more-vert', size: 24 }),
            default: () => h(MoreMenu, { isWritable: this.isWritable, onItemClick: this.handleMoreItemClick, onItemSelectChange: this.handleItemSelectChange })
          }),
        ]),
      ])
    );
  }
}