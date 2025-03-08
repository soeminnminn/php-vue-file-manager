import { h } from 'vue';
import SvgIcon from './svg-icon.js';
import { cases } from '../lib/utils.js';
// import './sidebar.css';

export default {
  name: 'sidebar',
  components: {
    SvgIcon,
  },
  props: {
    executableList: {
      type: Array,
      default: []
    },
    libraries: Object,
  },
  render() {
    return h('aside', { class: 'sidebar' }, [
      h('a', { class: 'nav-item', href: '#' }, [
        h(SvgIcon, { type: 'volumeIcons', d: 'folder-home', size: 24 }),
        h('span', { class: 'nav-item-label' }, this.$t('Home')),
      ]),

      (this.libraries ? 
        h('ul', { key: 'side-group-libraries', class: 'nav-group' }, [
          h('li', { key: 'side-library-downloads' }, 
            h('a', { class: 'nav-item', href: this.libraries['downloads'].path }, [
              h(SvgIcon, { type: 'volumeIcons', d: 'folder-download', size: 24 }),
              h('span', { class: 'nav-item-label' }, this.$t('Downloads')),
            ])
          ),
          h('li', { key: 'side-library-pictures'}, 
            h('a', { class: 'nav-item', href: this.libraries['pictures'].path }, [
              h(SvgIcon, { type: 'volumeIcons', d: 'folder-image', size: 24 }),
              h('span', { class: 'nav-item-label' }, this.$t('Pictures')),
            ])
          ),
          h('li', { key: 'side-library-music'}, 
            h('a', { class: 'nav-item', href: this.libraries['music'].path }, [
              h(SvgIcon, { type: 'volumeIcons', d: 'folder-music', size: 24 }),
              h('span', { class: 'nav-item-label' }, this.$t('Music')),
            ])
          ),
          h('li', { key: 'side-library-videos'}, 
            h('a', { class: 'nav-item', href: this.libraries['videos'].path }, [
              h(SvgIcon, { type: 'volumeIcons', d: 'video', size: 24 }),
              h('span', { class: 'nav-item-label' }, this.$t('Videos')),
            ])
          ),
        ]) : null
      ),
      
      h('ul', { key: 'side-group-executable', class: 'nav-group' }, [
        ...(this.executableList.map((x, i) =>
          h('li', { key: `side-executable-${i}` }, 
            h('a', { class: 'nav-item', href: x.executableFile, target: '_blank' }, [
              h(SvgIcon, { type: 'volumeIcons', d: 'folder-executable', size: 24 }),
              h('span', { class: 'nav-item-label' }, cases(x.name, ' ', true)),
            ])
          )
        ))
      ]),
    ]);
  }
}