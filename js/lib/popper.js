/**
 * @see https://github.com/floating-ui/floating-ui/tree/v1.x/packages/popper
 * @version 1.16.0
 */

/** @enum {'auto-start'|'auto'|'auto-end'|'top-start'|'top'|'top-end'|'right-start'|'right'|'right-end'|'bottom-end'|'bottom'|'bottom-start'|'left-end'|'left'|'left-start'} */
const placements = [
  'auto-start',
  'auto',
  'auto-end',
  'top-start',
  'top',
  'top-end',
  'right-start',
  'right',
  'right-end',
  'bottom-end',
  'bottom',
  'bottom-start',
  'left-end',
  'left',
  'left-start',
];

const validPlacements = placements.slice(3);

function clockwise(placement, counter = false) {
  const index = validPlacements.indexOf(placement);
  const arr = validPlacements
    .slice(index + 1)
    .concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

function getArea({ width, height }) {
  return width * height;
}

function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement, padding = 0) {
  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  const boundaries = getBoundaries(
    popper,
    reference,
    padding,
    boundariesElement
  );

  const rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top,
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height,
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom,
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height,
    },
  };

  const sortedAreas = Object.keys(rects)
    .map(key => ({
      key,
      ...rects[key],
      area: getArea(rects[key]),
    }))
    .sort((a, b) => b.area - a.area);

  const filteredAreas = sortedAreas.filter(
    ({ width, height }) =>
      width >= popper.clientWidth && height >= popper.clientHeight
  );

  const computedPlacement = filteredAreas.length > 0
    ? filteredAreas[0].key
    : sortedAreas[0].key;

  const variation = placement.split('-')[1];

  return computedPlacement + (variation ? `-${variation}` : '');
}

function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  const order =
    element1.compareDocumentPosition(element2) &
    Node.DOCUMENT_POSITION_FOLLOWING;
  const start = order ? element1 : element2;
  const end = order ? element2 : element1;

  // Get common ancestor container
  const range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  const { commonAncestorContainer } = range;

  // Both nodes are inside #document
  if (
    (element1 !== commonAncestorContainer &&
      element2 !== commonAncestorContainer) ||
    start.contains(end)
  ) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  const element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(cur => cur[prop] === value);
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  const match = find(arr, obj => obj[prop] === value);
  return arr.indexOf(match);
}

function getBordersSize(styles, axis) {
  const sideA = axis === 'x' ? 'Left' : 'Top';
  const sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return (
    parseFloat(styles[`border${sideA}Width`]) +
    parseFloat(styles[`border${sideB}Width`])
  );
}

function getBoundaries(popper, reference, padding, boundariesElement, fixedPosition = false) {
  let boundaries = { top: 0, left: 0 };
  const offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, getReferenceNode(reference));

  // Handle viewport case
  if (boundariesElement === 'viewport' ) {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  }

  else {
    // Handle other cases based on DOM element used as boundaries
    let boundariesNode;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(reference));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = popper.ownerDocument.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = popper.ownerDocument.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    const offsets = getOffsetRectRelativeToArbitraryNode(
      boundariesNode,
      offsetParent,
      fixedPosition
    );

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      const { height, width } = getWindowSizes(popper.ownerDocument);
      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  padding = padding || 0;
  const isPaddingNumber = typeof padding === 'number';
  boundaries.left += isPaddingNumber ? padding : padding.left || 0; 
  boundaries.top += isPaddingNumber ? padding : padding.top || 0; 
  boundaries.right -= isPaddingNumber ? padding : padding.right || 0; 
  boundaries.bottom -= isPaddingNumber ? padding : padding.bottom || 0; 

  return boundaries;
}

function getBoundingClientRect(element) {
  let rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      const scrollTop = getScroll(element, 'top');
      const scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    }
    else {
      rect = element.getBoundingClientRect();
    }
  }
  catch(e){}

  const result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };

  // subtract scrollbar size from sizes
  const sizes = element.nodeName === 'HTML' ? getWindowSizes(element.ownerDocument) : {};
  const width =
    sizes.width || element.clientWidth || result.width;
  const height =
    sizes.height || element.clientHeight || result.height;

  let horizScrollbar = element.offsetWidth - width;
  let vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    const styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getClientRect(offsets) {
  return {
    ...offsets,
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height,
  };
}

function getFixedPositionOffsetParent(element) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
   if (!element || !element.parentElement || isIE()) {
    return document.documentElement;
  }
  let el = element.parentElement;
  while (el && getStyleComputedProperty(el, 'transform') === 'none') {
    el = el.parentElement;
  }
  return el || document.documentElement;

}

function getOffsetParent(element) {
  if (!element) {
    return document.documentElement;
  }

  const noOffsetParent = isIE(10) ? document.body : null;

  // NOTE: 1 DOM access here
  let offsetParent = element.offsetParent || null;
  // Skip hidden elements which don't have an offsetParent
  while (offsetParent === noOffsetParent && element.nextElementSibling) {
    offsetParent = (element = element.nextElementSibling).offsetParent;
  }

  const nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return element ? element.ownerDocument.documentElement : document.documentElement;
  }

  // .offsetParent will return the closest TH, TD or TABLE in case
  // no offsetParent is present, I hate this job...
  if (
    ['TH', 'TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 &&
    getStyleComputedProperty(offsetParent, 'position') === 'static'
  ) {
    return getOffsetParent(offsetParent);
  }

  return offsetParent;
}

function getOffsetRect(element) {
  let elementRect;
  if (element.nodeName === 'HTML') {
    const { width, height } = getWindowSizes(element.ownerDocument);
    elementRect = {
      width,
      height,
      left: 0,
      top: 0,
    };
  } else {
    elementRect = {
      width: element.offsetWidth,
      height: element.offsetHeight,
      left: element.offsetLeft,
      top: element.offsetTop,
    };
  }

  // position
  return getClientRect(elementRect);
}

function getOffsetRectRelativeToArbitraryNode(children, parent, fixedPosition = false) {
  const isIE10 = isIE(10);
  const isHTML = parent.nodeName === 'HTML';
  const childrenRect = getBoundingClientRect(children);
  const parentRect = getBoundingClientRect(parent);
  const scrollParent = getScrollParent(children);

  const styles = getStyleComputedProperty(parent);
  const borderTopWidth = parseFloat(styles.borderTopWidth);
  const borderLeftWidth = parseFloat(styles.borderLeftWidth);

  // In cases where the parent is fixed, we must ignore negative scroll in offset calc
  if(fixedPosition && isHTML) {
    parentRect.top = Math.max(parentRect.top, 0);
    parentRect.left = Math.max(parentRect.left, 0);
  }
  let offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height,
  });
  offsets.marginTop = 0;
  offsets.marginLeft = 0;

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (!isIE10 && isHTML) {
    const marginTop = parseFloat(styles.marginTop);
    const marginLeft = parseFloat(styles.marginLeft);

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (
    isIE10 && !fixedPosition
      ? parent.contains(scrollParent)
      : parent === scrollParent && scrollParent.nodeName !== 'BODY'
  ) {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getOppositePlacement(placement) {
  const hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, matched => hash[matched]);
}

function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

function getOuterSizes(element) {
  const window = element.ownerDocument.defaultView;
  const styles = window.getComputedStyle(element);
  const x = parseFloat(styles.marginTop || 0) + parseFloat(styles.marginBottom || 0);
  const y = parseFloat(styles.marginLeft || 0) + parseFloat(styles.marginRight || 0);
  const result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x,
  };
  return result;
}

function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  const popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  const popperOffsets = {
    width: popperRect.width,
    height: popperRect.height,
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  const isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  const mainSide = isHoriz ? 'top' : 'left';
  const secondarySide = isHoriz ? 'left' : 'top';
  const measurement = isHoriz ? 'height' : 'width';
  const secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] =
    referenceOffsets[mainSide] +
    referenceOffsets[measurement] / 2 -
    popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] =
      referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] =
      referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

function getReferenceNode(reference) {
  return reference && reference.referenceNode ? reference.referenceNode : reference;
}

function getReferenceOffsets(state, popper, reference, fixedPosition = null) {
  const commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, getReferenceNode(reference));
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}

function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

function getRoundedOffsets(data, shouldRound) {
  const { popper, reference } = data.offsets;
  const { round, floor } = Math;
  const noRound = v => v;
  
  const referenceWidth = round(reference.width);
  const popperWidth = round(popper.width);
  
  const isVertical = ['left', 'right'].indexOf(data.placement) !== -1;
  const isVariation = data.placement.indexOf('-') !== -1;
  const sameWidthParity = referenceWidth % 2 === popperWidth % 2;
  const bothOddWidth = referenceWidth % 2 === 1 && popperWidth % 2 === 1;

  const horizontalToInteger = !shouldRound
    ? noRound
    : isVertical || isVariation || sameWidthParity
    ? round
    : floor;
  const verticalToInteger = !shouldRound ? noRound : round;

  return {
    left: horizontalToInteger(
      bothOddWidth && !isVariation && shouldRound
        ? popper.left - 1
        : popper.left
    ),
    top: verticalToInteger(popper.top),
    bottom: verticalToInteger(popper.bottom),
    right: horizontalToInteger(popper.right),
  };
}

function getScroll(element, side = 'top') {
  const upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  const nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    const html = element.ownerDocument.documentElement;
    const scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element) {
    return document.body
  }

  switch (element.nodeName) {
    case 'HTML':
    case 'BODY':
      return element.ownerDocument.body
    case '#document':
      return element.body
  }

  // Firefox want us to check `-x` and `-y` variations as well
  const { overflow, overflowX, overflowY } = getStyleComputedProperty(element);
  if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  const window = element.ownerDocument.defaultView;
  const css = window.getComputedStyle(element, null);
  return property ? css[property] : css;
}

function getSupportedPropertyName(property) {
  const prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
  const upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i];
    const toCheck = prefix ? `${prefix}${upperProp}` : property;
    if (typeof document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element, excludeScroll = false) {
  const html = element.ownerDocument.documentElement;
  const relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  const width = Math.max(html.clientWidth, window.innerWidth || 0);
  const height = Math.max(html.clientHeight, window.innerHeight || 0);

  const scrollTop = !excludeScroll ? getScroll(html) : 0;
  const scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

  const offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width,
    height,
  };

  return getClientRect(offset);
}

function getWindow(element) {
  const ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}

function getSize(axis, body, html, computedStyle) {
  return Math.max(
    body[`offset${axis}`],
    body[`scroll${axis}`],
    html[`client${axis}`],
    html[`offset${axis}`],
    html[`scroll${axis}`],
    isIE(10)
      ? (parseInt(html[`offset${axis}`]) + 
      parseInt(computedStyle[`margin${axis === 'Height' ? 'Top' : 'Left'}`]) + 
      parseInt(computedStyle[`margin${axis === 'Height' ? 'Bottom' : 'Right'}`]))
    : 0 
  );
}

function getWindowSizes(document) {
  const body = document.body;
  const html = document.documentElement;
  const computedStyle = isIE(10) && getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle),
  };
}

function includeScroll(rect, element, subtract = false) {
  const scrollTop = getScroll(element, 'top');
  const scrollLeft = getScroll(element, 'left');
  const modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined';
}

function isFixed(element) {
  const nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  const parentNode = getParentNode(element);
  if (!parentNode) {
    return false;
  }
  return isFixed(parentNode);
}

function isFunction(functionToCheck) {
  const getType = {};
  return (
    functionToCheck &&
    getType.toString.call(functionToCheck) === '[object Function]'
  );
}

function isIE(version) {
  const isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
  const isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

  if (version === 11) {
    return isIE11;
  }
  if (version === 10) {
    return isIE10;
  }
  return isIE11 || isIE10;
}

function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(
    ({ name, enabled }) => enabled && name === modifierName
  );
}

function isModifierRequired(modifiers, requestingName, requestedName) {
  const requesting = find(modifiers, ({ name }) => name === requestingName);

  const isRequired =
    !!requesting &&
    modifiers.some(modifier => {
      return (
        modifier.name === requestedName &&
        modifier.enabled &&
        modifier.order < requesting.order
      );
    });

  if (!isRequired) {
    const requesting = `\`${requestingName}\``;
    const requested = `\`${requestedName}\``;
    console.warn(
      `${requested} modifier is required by ${requesting} modifier in order to work, be sure to include it before ${requesting}!`
    );
  }
  return isRequired;
}

function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

function isArray(value) {
  return Array.isArray ? Array.isArray(value) : {}.toString.call(value) === '[object Array]';
}

function isOffsetContainer(element) {
  const { nodeName } = element;
  if (nodeName === 'BODY') {
    return false;
  }
  return (
    nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element
  );
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  const isBody = scrollParent.nodeName === 'BODY';
  const target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(
      getScrollParent(target.parentNode),
      event,
      callback,
      scrollParents
    );
  }
  scrollParents.push(target);
}

function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  const scrollElement = getScrollParent(reference);
  attachToScrollParents(
    scrollElement,
    'scroll',
    state.updateBound,
    state.scrollParents
  );
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  getWindow(reference).removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(target => {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function(prop) {
    const value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

function setStyles(element, styles) {
  Object.keys(styles).forEach(prop => {
    let unit = '';
    // add unit if the value is numeric and is one of the following
    if (
      ['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !==
        -1 &&
      isNumeric(styles[prop])
    ) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

function runModifiers(modifiers, data, ends) {
  const modifiersToRun = ends === undefined
    ? modifiers
    : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(modifier => {
    const fn = modifier.fn; // eslint-disable-line dot-notation
    if (modifier.enabled && isFunction(fn)) {
      // Add properties to offsets to make them a complete clientRect object
      // we do this before each modifier to make sure the previous one doesn't
      // mess with these values
      data.offsets.popper = getClientRect(data.offsets.popper);
      data.offsets.reference = getClientRect(data.offsets.reference);

      data = fn(data, modifier);
    }
  });

  return data;
}

const debounce = (() => {
  const timeoutDuration = (function(){
    const longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
    for (let i = 0; i < longerTimeoutBrowsers.length; i += 1) {
      if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
        return 1;
      }
    }
    return 0;
  }());

  function microtaskDebounce(fn) {
    let called = false;
    return () => {
      if (called) {
        return;
      }
      called = true
      window.Promise.resolve().then(() => {
        called = false;
        fn();
      });
    }
  }

  function taskDebounce(fn) {
    let scheduled = false;
    return () => {
      if (!scheduled) {
        scheduled = true;
        setTimeout(() => {
          scheduled = false;
          fn();
        }, timeoutDuration);
      }
    };
  }

  const supportsMicroTasks = isBrowser && window.Promise;
  
  return (supportsMicroTasks ? microtaskDebounce : taskDebounce);
})();

class ApplyStyle {
  constructor() {
    this.order = 900;
    this.enabled = true;
    this.fn = this.modify.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this.gpuAcceleration = undefined;
  }

  modify(data) {
    // any property present in `data.styles` will be applied to the popper,
    // in this way we can make the 3rd party modifiers add custom styles to it
    // Be aware, modifiers could override the properties defined in the previous
    // lines of this modifier!
    setStyles(data.instance.popper, data.styles);
  
    // any property present in `data.attributes` will be applied to the popper,
    // they will be set as HTML attributes of the element
    setAttributes(data.instance.popper, data.attributes);
  
    // if arrowElement is defined and arrowStyles has some properties
    if (data.arrowElement && Object.keys(data.arrowStyles).length) {
      setStyles(data.arrowElement, data.arrowStyles);
    }
  
    return data;
  }

  onLoad(reference, popper, options, modifierOptions, state) {
    // compute reference element offsets
    const referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);
  
    // compute auto placement, store placement inside the data object,
    // modifiers will be able to edit `placement` if needed
    // and refer to originalPlacement to know the original value
    const placement = computeAutoPlacement(
      options.placement,
      referenceOffsets,
      popper,
      reference,
      options.modifiers.flip.boundariesElement,
      options.modifiers.flip.padding
    );
  
    popper.setAttribute('x-placement', placement);
  
    // Apply `position` to popper before anything else because
    // without the position applied we can't guarantee correct computations
    setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });
  
    return options;
  }
}

class Arrow {
  constructor() {
    this.order = 500;
    this.enabled = true;
    this.fn = this.arrow.bind(this);
    this.element = '[x-arrow]';
  }

  arrow(data, options) {
    // arrow depends on keepTogether in order to work
    if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
      return data;
    }
  
    let arrowElement = options.element;
  
    // if arrowElement is a string, suppose it's a CSS selector
    if (typeof arrowElement === 'string') {
      arrowElement = data.instance.popper.querySelector(arrowElement);
  
      // if arrowElement is not found, don't run the modifier
      if (!arrowElement) {
        return data;
      }
    } else {
      // if the arrowElement isn't a query selector we must check that the
      // provided DOM node is child of its popper node
      if (!data.instance.popper.contains(arrowElement)) {
        console.warn(
          'WARNING: `arrow.element` must be child of its popper element!'
        );
        return data;
      }
    }
  
    const placement = data.placement.split('-')[0];
    const { popper, reference } = data.offsets;
    const isVertical = ['left', 'right'].indexOf(placement) !== -1;
  
    const len = isVertical ? 'height' : 'width';
    const sideCapitalized = isVertical ? 'Top' : 'Left';
    const side = sideCapitalized.toLowerCase();
    const altSide = isVertical ? 'left' : 'top';
    const opSide = isVertical ? 'bottom' : 'right';
    const arrowElementSize = getOuterSizes(arrowElement)[len];
  
    //
    // extends keepTogether behavior making sure the popper and its
    // reference have enough pixels in conjunction
    //
  
    // top/left side
    if (reference[opSide] - arrowElementSize < popper[side]) {
      data.offsets.popper[side] -=
        popper[side] - (reference[opSide] - arrowElementSize);
    }
    // bottom/right side
    if (reference[side] + arrowElementSize > popper[opSide]) {
      data.offsets.popper[side] +=
        reference[side] + arrowElementSize - popper[opSide];
    }
    data.offsets.popper = getClientRect(data.offsets.popper);
  
    // compute center of the popper
    const center = reference[side] + reference[len] / 2 - arrowElementSize / 2;
  
    // Compute the sideValue using the updated popper offsets
    // take popper margin in account because we don't have this info available
    const css = getStyleComputedProperty(data.instance.popper);
    const popperMarginSide = parseFloat(css[`margin${sideCapitalized}`]);
    const popperBorderSide = parseFloat(css[`border${sideCapitalized}Width`]);
    let sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;
  
    // prevent arrowElement from being placed not contiguously to its popper
    sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);
  
    data.arrowElement = arrowElement;
    data.offsets.arrow = {
      [side]: Math.round(sideValue),
      [altSide]: '', // make sure to unset any eventual altSide value from the DOM node
    };
  
    return data;
  }
}

class ComputeStyle {
  constructor() {
    this.isFirefox = isBrowser && /Firefox/i.test(navigator.userAgent);
    this.order = 850;
    this.enabled = true;
    this.fn = this.modify.bind(this);
    this.gpuAcceleration = true;
    this.x = 'bottom';
    this.y = 'right';
  }

  modify(data, options) {
    const { x, y } = options;
    const { popper } = data.offsets;
  
    // Remove this legacy support in Popper.js v2
    const legacyGpuAccelerationOption = find(
      data.instance.modifiers,
      modifier => modifier.name === 'applyStyle'
    ).gpuAcceleration;
    if (legacyGpuAccelerationOption !== undefined) {
      console.warn(
        'WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!'
      );
    }
    const gpuAcceleration =
      legacyGpuAccelerationOption !== undefined
        ? legacyGpuAccelerationOption
        : options.gpuAcceleration;
  
    const offsetParent = getOffsetParent(data.instance.popper);
    const offsetParentRect = getBoundingClientRect(offsetParent);
  
    // Styles
    const styles = {
      position: popper.position,
    };
  
    const offsets = getRoundedOffsets(
      data,
      window.devicePixelRatio < 2 || !this.isFirefox
    );
  
    const sideA = x === 'bottom' ? 'top' : 'bottom';
    const sideB = y === 'right' ? 'left' : 'right';
  
    // if gpuAcceleration is set to `true` and transform is supported,
    //  we use `translate3d` to apply the position to the popper we
    // automatically use the supported prefixed version if needed
    const prefixedProperty = getSupportedPropertyName('transform');
  
    // now, let's make a step back and look at this code closely (wtf?)
    // If the content of the popper grows once it's been positioned, it
    // may happen that the popper gets misplaced because of the new content
    // overflowing its reference element
    // To avoid this problem, we provide two options (x and y), which allow
    // the consumer to define the offset origin.
    // If we position a popper on top of a reference element, we can set
    // `x` to `top` to make the popper grow towards its top instead of
    // its bottom.
    let left, top;
    if (sideA === 'bottom') {
      // when offsetParent is <html> the positioning is relative to the bottom of the screen (excluding the scrollbar)
      // and not the bottom of the html element
      if (offsetParent.nodeName === 'HTML') {
        top = -offsetParent.clientHeight + offsets.bottom;
      } else {
        top = -offsetParentRect.height + offsets.bottom;
      }
    } else {
      top = offsets.top;
    }
    if (sideB === 'right') {
      if (offsetParent.nodeName === 'HTML') {
        left = -offsetParent.clientWidth + offsets.right;
      } else {
        left = -offsetParentRect.width + offsets.right;
      }
    } else {
      left = offsets.left;
    }
    if (gpuAcceleration && prefixedProperty) {
      styles[prefixedProperty] = `translate3d(${left}px, ${top}px, 0)`;
      styles[sideA] = 0;
      styles[sideB] = 0;
      styles.willChange = 'transform';
    } else {
      // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
      const invertTop = sideA === 'bottom' ? -1 : 1;
      const invertLeft = sideB === 'right' ? -1 : 1;
      styles[sideA] = top * invertTop;
      styles[sideB] = left * invertLeft;
      styles.willChange = `${sideA}, ${sideB}`;
    }
  
    // Attributes
    const attributes = {
      'x-placement': data.placement,
    };
  
    // Update `data` attributes, styles and arrowStyles
    data.attributes = { ...attributes, ...data.attributes };
    data.styles = { ...styles, ...data.styles };
    data.arrowStyles = { ...data.offsets.arrow, ...data.arrowStyles };
  
    return data;
  }
}

class Flip {
  static BEHAVIORS = {
    FLIP: 'flip',
    CLOCKWISE: 'clockwise',
    COUNTERCLOCKWISE: 'counterclockwise',
  };

  constructor() {
    this.order = 600;
    this.enabled = true;
    this.fn = this.modify.bind(this);
    this.behavior = 'flip';
    this.padding = 5;
    this.boundariesElement = 'viewport';
    this.flipVariations = false;
    this.flipVariationsByContent = false;
  }

  modify(data, options) {
    // if `inner` modifier is enabled, we can't use the `flip` modifier
    if (isModifierEnabled(data.instance.modifiers, 'inner')) {
      return data;
    }
  
    if (data.flipped && data.placement === data.originalPlacement) {
      // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
      return data;
    }
  
    const boundaries = getBoundaries(
      data.instance.popper,
      data.instance.reference,
      options.padding,
      options.boundariesElement,
      data.positionFixed
    );
  
    let placement = data.placement.split('-')[0];
    let placementOpposite = getOppositePlacement(placement);
    let variation = data.placement.split('-')[1] || '';
  
    let flipOrder = [];
  
    switch (options.behavior) {
      case Flip.BEHAVIORS.FLIP:
        flipOrder = [placement, placementOpposite];
        break;
      case Flip.BEHAVIORS.CLOCKWISE:
        flipOrder = clockwise(placement);
        break;
      case Flip.BEHAVIORS.COUNTERCLOCKWISE:
        flipOrder = clockwise(placement, true);
        break;
      default:
        flipOrder = options.behavior;
    }
  
    flipOrder.forEach((step, index) => {
      if (placement !== step || flipOrder.length === index + 1) {
        return data;
      }
  
      placement = data.placement.split('-')[0];
      placementOpposite = getOppositePlacement(placement);
  
      const popperOffsets = data.offsets.popper;
      const refOffsets = data.offsets.reference;
  
      // using floor because the reference offsets may contain decimals we are not going to consider here
      const floor = Math.floor;
      const overlapsRef =
        (placement === 'left' &&
          floor(popperOffsets.right) > floor(refOffsets.left)) ||
        (placement === 'right' &&
          floor(popperOffsets.left) < floor(refOffsets.right)) ||
        (placement === 'top' &&
          floor(popperOffsets.bottom) > floor(refOffsets.top)) ||
        (placement === 'bottom' &&
          floor(popperOffsets.top) < floor(refOffsets.bottom));
  
      const overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
      const overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
      const overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
      const overflowsBottom =
        floor(popperOffsets.bottom) > floor(boundaries.bottom);
  
      const overflowsBoundaries =
        (placement === 'left' && overflowsLeft) ||
        (placement === 'right' && overflowsRight) ||
        (placement === 'top' && overflowsTop) ||
        (placement === 'bottom' && overflowsBottom);
  
      // flip the variation if required
      const isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  
      // flips variation if reference element overflows boundaries
      const flippedVariationByRef =
        !!options.flipVariations &&
        ((isVertical && variation === 'start' && overflowsLeft) ||
          (isVertical && variation === 'end' && overflowsRight) ||
          (!isVertical && variation === 'start' && overflowsTop) ||
          (!isVertical && variation === 'end' && overflowsBottom));
  
      // flips variation if popper content overflows boundaries
      const flippedVariationByContent =
        !!options.flipVariationsByContent &&
        ((isVertical && variation === 'start' && overflowsRight) ||
          (isVertical && variation === 'end' && overflowsLeft) ||
          (!isVertical && variation === 'start' && overflowsBottom) ||
          (!isVertical && variation === 'end' && overflowsTop));
  
      const flippedVariation = flippedVariationByRef || flippedVariationByContent;
  
      if (overlapsRef || overflowsBoundaries || flippedVariation) {
        // this boolean to detect any flip loop
        data.flipped = true;
  
        if (overlapsRef || overflowsBoundaries) {
          placement = flipOrder[index + 1];
        }
  
        if (flippedVariation) {
          variation = getOppositeVariation(variation);
        }
  
        data.placement = placement + (variation ? '-' + variation : '');
  
        // this object contains `position`, we want to preserve it along with
        // any additional property we may add in the future
        data.offsets.popper = {
          ...data.offsets.popper,
          ...getPopperOffsets(
            data.instance.popper,
            data.offsets.reference,
            data.placement
          ),
        };
  
        data = runModifiers(data.instance.modifiers, data, 'flip');
      }
    });
    return data;
  }
}

class Hide {
  constructor() {
    this.order = 800;
    this.enabled = true;
    this.fn = this.modify.bind(this);
  }

  modify(data) {
    if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
      return data;
    }
  
    const refRect = data.offsets.reference;
    const bound = find(
      data.instance.modifiers,
      modifier => modifier.name === 'preventOverflow'
    ).boundaries;
  
    if (
      refRect.bottom < bound.top ||
      refRect.left > bound.right ||
      refRect.top > bound.bottom ||
      refRect.right < bound.left
    ) {
      // Avoid unnecessary DOM access if visibility hasn't changed
      if (data.hide === true) {
        return data;
      }
  
      data.hide = true;
      data.attributes['x-out-of-boundaries'] = '';
    } else {
      // Avoid unnecessary DOM access if visibility hasn't changed
      if (data.hide === false) {
        return data;
      }
  
      data.hide = false;
      data.attributes['x-out-of-boundaries'] = false;
    }
  
    return data;
  }
}

class Inner {
  constructor() {
    this.order = 700;
    this.enabled = false;
    this.fn = this.modify.bind(this);
  }

  modify(data) {
    const placement = data.placement;
    const basePlacement = placement.split('-')[0];
    const { popper, reference } = data.offsets;
    const isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;
  
    const subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;
  
    popper[isHoriz ? 'left' : 'top'] =
      reference[basePlacement] -
      (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);
  
    data.placement = getOppositePlacement(placement);
    data.offsets.popper = getClientRect(popper);
  
    return data;
  }
}

class KeepTogether {
  constructor() {
    this.order = 400;
    this.enabled = true;
    this.fn = this.modify.bind(this);
  }

  modify(data) {
    const { popper, reference } = data.offsets;
    const placement = data.placement.split('-')[0];
    const floor = Math.floor;
    const isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    const side = isVertical ? 'right' : 'bottom';
    const opSide = isVertical ? 'left' : 'top';
    const measurement = isVertical ? 'width' : 'height';
  
    if (popper[side] < floor(reference[opSide])) {
      data.offsets.popper[opSide] =
        floor(reference[opSide]) - popper[measurement];
    }
    if (popper[opSide] > floor(reference[side])) {
      data.offsets.popper[opSide] = floor(reference[side]);
    }
  
    return data;
  }
}

class Offset {
  constructor() {
    this.order = 200;
    this.enabled = true;
    this.fn = this.modify.bind(this);
    this.offset = 0;
  }

  toValue(str, measurement, popperOffsets, referenceOffsets) {
    // separate value from unit
    const split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
    const value = +split[1];
    const unit = split[2];
  
    // If it's not a number it's an operator, I guess
    if (!value) {
      return str;
    }
  
    if (unit.indexOf('%') === 0) {
      let element;
      switch (unit) {
        case '%p':
          element = popperOffsets;
          break;
        case '%':
        case '%r':
        default:
          element = referenceOffsets;
      }
  
      const rect = getClientRect(element);
      return rect[measurement] / 100 * value;
    } else if (unit === 'vh' || unit === 'vw') {
      // if is a vh or vw, we calculate the size based on the viewport
      let size;
      if (unit === 'vh') {
        size = Math.max(
          document.documentElement.clientHeight,
          window.innerHeight || 0
        );
      } else {
        size = Math.max(
          document.documentElement.clientWidth,
          window.innerWidth || 0
        );
      }
      return size / 100 * value;
    } else {
      // if is an explicit pixel unit, we get rid of the unit and keep the value
      // if is an implicit unit, it's px, and we return just the value
      return value;
    }
  }

  parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
    const offsets = [0, 0];

    let offsetString = offset;
    if (isFunction(offset)) {
      offsetString = offset(popperOffsets);

    } else if (isArray(offset)) {
      offsetString = offset.join(',');
    }
  
    // Use height if placement is left or right and index is 0 otherwise use width
    // in this way the first offset will use an axis and the second one
    // will use the other one
    const useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;
  
    // Split the offset string to obtain a list of values and operands
    // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
    const fragments = offsetString.split(/(\+|\-)/).map(frag => frag.trim());
  
    // Detect if the offset string contains a pair of values or a single one
    // they could be separated by comma or space
    const divider = fragments.indexOf(
      find(fragments, frag => frag.search(/,|\s/) !== -1)
    );
  
    if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
      console.warn(
        'Offsets separated by white space(s) are deprecated, use a comma (,) instead.'
      );
    }
  
    // If divider is found, we divide the list of values and operands to divide
    // them by ofset X and Y.
    const splitRegex = /\s*,\s*|\s+/;
    let ops = divider !== -1
      ? [
          fragments
            .slice(0, divider)
            .concat([fragments[divider].split(splitRegex)[0]]),
          [fragments[divider].split(splitRegex)[1]].concat(
            fragments.slice(divider + 1)
          ),
        ]
      : [fragments];
  
    // Convert the values with units to absolute pixels to allow our computations
    ops = ops.map((op, index) => {
      // Most of the units rely on the orientation of the popper
      const measurement = (index === 1 ? !useHeight : useHeight)
        ? 'height'
        : 'width';
      let mergeWithPrevious = false;
      return (
        op
          // This aggregates any `+` or `-` sign that aren't considered operators
          // e.g.: 10 + +5 => [10, +, +5]
          .reduce((a, b) => {
            if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
              a[a.length - 1] = b;
              mergeWithPrevious = true;
              return a;
            } else if (mergeWithPrevious) {
              a[a.length - 1] += b;
              mergeWithPrevious = false;
              return a;
            } else {
              return a.concat(b);
            }
          }, [])
          // Here we convert the string values into number values (in px)
          .map(str => this.toValue(str, measurement, popperOffsets, referenceOffsets))
      );
    });
  
    // Loop trough the offsets arrays and execute the operations
    ops.forEach((op, index) => {
      op.forEach((frag, index2) => {
        if (isNumeric(frag)) {
          offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
        }
      });
    });
    return offsets;
  }

  modify(data, { offset }) {
    const { placement, offsets: { popper, reference } } = data;
    const basePlacement = placement.split('-')[0];
  
    let offsets;
    if (isNumeric(+offset)) {
      offsets = [+offset, 0];
    } else {
      offsets = this.parseOffset(offset, popper, reference, basePlacement);
    }
  
    if (basePlacement === 'left') {
      popper.top += offsets[0];
      popper.left -= offsets[1];
    } else if (basePlacement === 'right') {
      popper.top += offsets[0];
      popper.left += offsets[1];
    } else if (basePlacement === 'top') {
      popper.left += offsets[0];
      popper.top -= offsets[1];
    } else if (basePlacement === 'bottom') {
      popper.left += offsets[0];
      popper.top += offsets[1];
    }
  
    data.popper = popper;
    return data;
  }
}

class PreventOverflow {
  constructor() {
    this.order = 300;
    this.enabled = true;
    this.fn = this.modify.bind(this);
    this.priority = ['left', 'right', 'top', 'bottom'];
    this.padding = 5;
    this.boundariesElement = 'scrollParent';
  }

  modify(data, options) {
    let boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);
  
    // If offsetParent is the reference element, we really want to
    // go one step up and use the next offsetParent as reference to
    // avoid to make this modifier completely useless and look like broken
    if (data.instance.reference === boundariesElement) {
      boundariesElement = getOffsetParent(boundariesElement);
    }
  
    // NOTE: DOM access here
    // resets the popper's position so that the document size can be calculated excluding
    // the size of the popper element itself
    const transformProp = getSupportedPropertyName('transform');
    const popperStyles = data.instance.popper.style; // assignment to help minification
    const { top, left, [transformProp]: transform } = popperStyles;
    popperStyles.top = '';
    popperStyles.left = '';
    popperStyles[transformProp] = '';
  
    const boundaries = getBoundaries(
      data.instance.popper,
      data.instance.reference,
      options.padding,
      boundariesElement,
      data.positionFixed
    );
  
    // NOTE: DOM access here
    // restores the original style properties after the offsets have been computed
    popperStyles.top = top;
    popperStyles.left = left;
    popperStyles[transformProp] = transform;
  
    options.boundaries = boundaries;
  
    const order = options.priority;
    let popper = data.offsets.popper;
  
    const check = {
      primary(placement) {
        let value = popper[placement];
        if (
          popper[placement] < boundaries[placement] &&
          !options.escapeWithReference
        ) {
          value = Math.max(popper[placement], boundaries[placement]);
        }
        return { [placement]: value };
      },
      secondary(placement) {
        const mainSide = placement === 'right' ? 'left' : 'top';
        let value = popper[mainSide];
        if (
          popper[placement] > boundaries[placement] &&
          !options.escapeWithReference
        ) {
          value = Math.min(
            popper[mainSide],
            boundaries[placement] -
              (placement === 'right' ? popper.width : popper.height)
          );
        }
        return { [mainSide]: value };
      },
    };
  
    order.forEach(placement => {
      const side =
        ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
      popper = { ...popper, ...check[side](placement) };
    });
  
    data.offsets.popper = popper;
  
    return data;
  }
}

class Shift {
  constructor() {
    this.order = 100;
    this.enabled = true;
    this.fn = this.modify.bind(this);
  }

  modify(data) {
    const placement = data.placement;
    const basePlacement = placement.split('-')[0];
    const shiftvariation = placement.split('-')[1];
  
    // if shift shiftvariation is specified, run the modifier
    if (shiftvariation) {
      const { reference, popper } = data.offsets;
      const isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
      const side = isVertical ? 'left' : 'top';
      const measurement = isVertical ? 'width' : 'height';
  
      const shiftOffsets = {
        start: { [side]: reference[side] },
        end: {
          [side]: reference[side] + reference[measurement] - popper[measurement],
        },
      };
  
      data.offsets.popper = { ...popper, ...shiftOffsets[shiftvariation] };
    }
  
    return data;
  }
}

export const Modifiers = {
  shift: new Shift(),
  offset: new Offset(),
  preventOverflow: new PreventOverflow(),
  keepTogether: new KeepTogether(),
  arrow: new Arrow(),
  flip: new Flip(),
  inner: new Inner(),
  hide: new Hide(),
  computeStyle: new ComputeStyle(),
  applyStyle: new ApplyStyle()
};

const defaultsOptions = {
  placement: 'bottom',
  positionFixed: false,
  eventsEnabled: true,
  removeOnDestroy: false,
  onCreate: () => {},
  onUpdate: () => {},
  modifiers: Modifiers,
};

const PopperUtils = {
  computeAutoPlacement,
  debounce,
  findIndex,
  getBordersSize,
  getBoundaries,
  getBoundingClientRect,
  getClientRect,
  getOffsetParent,
  getOffsetRect,
  getOffsetRectRelativeToArbitraryNode,
  getOuterSizes,
  getParentNode,
  getPopperOffsets,
  getReferenceOffsets,
  getScroll,
  getScrollParent,
  getStyleComputedProperty,
  getSupportedPropertyName,
  getWindowSizes,
  isFixed,
  isFunction,
  isModifierEnabled,
  isModifierRequired,
  isNumeric,
  isArray,
  removeEventListeners,
  runModifiers,
  setAttributes,
  setStyles,
  setupEventListeners,
};

export default class Popper {
  static version = 'v1.16.1';
  static Utils = PopperUtils;
  static placements = placements;
  static Defaults = defaultsOptions;

  constructor(reference, popper, options = {}) {
    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: [],
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference && reference.jquery ? reference[0] : reference;
    this.popper = popper && popper.jquery ? popper[0] : popper;

    // with {} we create a new object with the options inside it
    this.options = {};
    this.setOptions(options);

    // fire the first update to position the popper in the right place
    this.update();
  }

  setOptions(options) {
    const oldOptions = this.options || {};

    // with {} we create a new object with the options inside it
    this.options = { ...Popper.Defaults, ...oldOptions, ...options };
	
    if (options.modifiers && Array.isArray(options.modifiers)) {
      const modifiers = options.modifiers.reduce((t, x) => {
        t[x.name] = {
          ...x,
          options: undefined,
          ...(x.options || {}),
        };
        return t;
      }, {});

      options.modifiers = modifiers;
    }

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys({
      ...Popper.Defaults.modifiers,
      ...oldOptions.modifiers,
      ...options.modifiers,
    }).forEach(name => {
      this.options.modifiers[name] = {
        // If it's a built-in modifier, use it as base
        ...(Popper.Defaults.modifiers[name] || {}),
        // If there are custom options, override and merge with default ones
        ...(options.modifiers ? options.modifiers[name] : {}),
      };
    });
    
    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers)
      .map(name => ({
        name,
        ...this.options.modifiers[name],
      }))
      // sort the modifiers by order
      .sort((a, b) => a.order - b.order);

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(modifierOptions => {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(
          this.reference,
          this.popper,
          this.options,
          modifierOptions,
          this.state
        );
      }
    });

    const eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  update() {
    // if popper is destroyed, don't perform any further update
    if (this.state.isDestroyed) {
      return;
    }

    let data = {
      instance: this,
      styles: {},
      arrowStyles: {},
      attributes: {},
      flipped: false,
      offsets: {},
    };

    // compute reference element offsets
    data.offsets.reference = getReferenceOffsets(
      this.state,
      this.popper,
      this.reference,
      this.options.positionFixed
    );

    // compute auto placement, store placement inside the data object,
    // modifiers will be able to edit `placement` if needed
    // and refer to originalPlacement to know the original value
    data.placement = computeAutoPlacement(
      this.options.placement,
      data.offsets.reference,
      this.popper,
      this.reference,
      this.options.modifiers.flip.boundariesElement,
      this.options.modifiers.flip.padding
    );

    // store the computed placement inside `originalPlacement`
    data.originalPlacement = data.placement;

    data.positionFixed = this.options.positionFixed;

    // compute the popper offsets
    data.offsets.popper = getPopperOffsets(
      this.popper,
      data.offsets.reference,
      data.placement
    );

    data.offsets.popper.position = this.options.positionFixed
      ? 'fixed'
      : 'absolute';

    // run the modifiers
    data = runModifiers(this.modifiers, data);

    // the first `update` will call `onCreate` callback
    // the other ones will call `onUpdate` callback
    if (!this.state.isCreated) {
      this.state.isCreated = true;
      this.options.onCreate(data);
    } else {
      this.options.onUpdate(data);
    }
  }

  destroy() {
    this.state.isDestroyed = true;

    // touch DOM only if `applyStyle` modifier is enabled
    if (isModifierEnabled(this.modifiers, 'applyStyle')) {
      this.popper.removeAttribute('x-placement');
      this.popper.style.position = '';
      this.popper.style.top = '';
      this.popper.style.left = '';
      this.popper.style.right = '';
      this.popper.style.bottom = '';
      this.popper.style.willChange = '';
      this.popper.style[getSupportedPropertyName('transform')] = '';
    }

    this.disableEventListeners();

    // remove the popper if user explicitly asked for the deletion on destroy
    // do not use `remove` because IE11 doesn't support it
    if (this.options.removeOnDestroy) {
      this.popper.parentNode.removeChild(this.popper);
    }
    return this;
  }

  enableEventListeners() {
    if (!this.state.eventsEnabled) {
      this.state = setupEventListeners(
        this.reference,
        this.options,
        this.state,
        this.scheduleUpdate
      );
    }
  }

  disableEventListeners() {
    if (this.state.eventsEnabled) {
      cancelAnimationFrame(this.scheduleUpdate);
      this.state = removeEventListeners(this.reference, this.state);
    }
  }

  scheduleUpdate = () => requestAnimationFrame(this.update);
}

/**
 * @param {HTMLElement} reference 
 * @param {HTMLElement} popper 
 * @param {object} options 
 * @returns {Popper}
 */
Popper.createPopper = function(reference, popper, options) {
  return new Popper(reference, popper, options);
}