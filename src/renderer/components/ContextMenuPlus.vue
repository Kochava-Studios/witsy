<template>
  <Teleport to="body" :disabled="!teleport">
    <template v-if="position">
      <Overlay @click="onOverlay" @contextmenu="onOverlay" />
      <!-- Hidden chevron template for cloning -->
      <ChevronRightIcon ref="chevronTemplate" style="display: none;" class="chevron-template" />
      <div class="context-menu" :class="cssClasses" :style="position" @keydown="onKeyDown" @keyup="onKeyUp" v-bind="$attrs">
      <!-- Top level filter or back/filter header -->
      <div v-if="showFilter || currentSubmenu || (items && dataSubmenuStack.length > 0)" class="header">
        <div v-if="currentSubmenu || (items && dataSubmenuStack.length > 0)" class="back-button" @click="goBack" ref="backButton">
          <MoveLeftIcon />
        </div>
        <div v-if="shouldShowCurrentFilter" class="filter-input">
          <input v-model="filter" :placeholder="t('common.search')" autofocus="true" @keydown.stop="onKeyDown" @keyup.stop="onKeyUp" />
        </div>
        <div v-else-if="currentSubmenu || (items && dataSubmenuStack.length > 0)" class="back-label">
          {{ t('back') }}
        </div>
      </div>
      
      <div class="actions" ref="list">
        <!-- Data-driven mode: render from items prop -->
        <template v-if="items && items.length">
          <template v-for="item in (currentDataItems || items)" :key="`${item.id}-${item.checked}-${item.indeterminate}`">
            <!-- Separator -->
            <div v-if="item.type === 'separator'" class="item separator">
              <hr>
            </div>
            <!-- Regular item, checkbox, or group -->
            <div
              v-else
              class="item"
              :class="{
                'has-submenu': !!item.submenu,
                'disabled': item.disabled,
                [item.cssClass || '']: !!item.cssClass
              }"
              :data-id="item.id"
              @click="handleDataItemClick(item)"
            >
              <component v-if="item.icon" :is="item.icon" class="icon" />
              <input
                v-if="item.type === 'checkbox'"
                type="checkbox"
                :checked="item.checked"
                :data-indeterminate="item.indeterminate"
                @click.stop="item.onClick && item.onClick()"
              />
              <span>{{ item.label }}</span>
              <ChevronRightIcon v-if="item.submenu" class="chevron-icon" />
            </div>
          </template>
        </template>

        <!-- Slot-based mode: use existing slot rendering (backward compatible) -->
        <template v-else>
          <template v-if="!currentSubmenu">
            <slot :filter="filter" :selected="selected" :withFilter="setSubmenuFilter" />
          </template>
          <template v-else>
            <slot :name="currentSubmenu" :filter="filter" :selected="selected" :goBack="goBack" :withFilter="setSubmenuFilter" />
          </template>
        </template>
      </div>

      <!-- Footer section -->
      <div v-if="hasFooter" class="footer" ref="footer">
        <!-- Data-driven footer -->
        <template v-if="items && currentDataFooter && currentDataFooter.length">
          <!-- Multiple items = buttons (Select All / Unselect All) -->
          <div v-if="currentDataFooter.length > 1" class="footer-select">
            <button
              v-for="footerItem in currentDataFooter"
              :key="footerItem.id"
              :class="{ 'disabled': footerItem.disabled }"
              :disabled="footerItem.disabled"
              @click.stop="footerItem.onClick && footerItem.onClick()"
            >
              <component v-if="footerItem.icon" :is="footerItem.icon" />
              {{ footerItem.label }}
            </button>
          </div>
          <!-- Single item = menu item (Clear / Manage) -->
          <div
            v-else
            v-for="footerItem in currentDataFooter"
            :key="footerItem.id"
            class="item"
            :class="{ 'disabled': footerItem.disabled }"
            @click.stop="footerItem.onClick && footerItem.onClick()"
          >
            <component v-if="footerItem.icon" :is="footerItem.icon" class="icon" />
            <span>{{ footerItem.label }}</span>
          </div>
        </template>

        <!-- Slot-based footer (backward compatible) -->
        <template v-else-if="!items">
          <template v-if="!currentSubmenu">
            <slot name="footer" :filter="filter" :selected="selected" :withFilter="setSubmenuFilter" />
          </template>
          <template v-else>
            <slot :name="`${currentSubmenu}Footer`" :filter="filter" :selected="selected" :goBack="goBack" :withFilter="setSubmenuFilter" />
          </template>
        </template>
      </div>
    </div>
    </template>
  </Teleport>
</template>

<script setup lang="ts">

import Overlay from '@components/Overlay.vue'
import useEventListener from '@composables/event_listener'
import { t } from '@services/i18n'
import { ChevronRightIcon, MoveLeftIcon } from 'lucide-vue-next'
import type { MenuItem } from 'types/menu'
import { computed, nextTick, onMounted, ref, useSlots, watch } from 'vue'

const { onDomEvent } = useEventListener()

export type MenuPosition = 'below' | 'above' | 'right' | 'left' | 'above-right' | 'above-left' | 'below-right' | 'below-left'

const props = defineProps({
  anchor: {
    type: String,
    required: false
  },
  mouseX: {
    type: Number,
    required: false
  },
  mouseY: {
    type: Number,
    required: false
  },
  position: {
    type: String as () => MenuPosition,
    default: 'below',
  },
  showFilter: {
    type: Boolean,
    default: false
  },
  teleport: {
    type: Boolean,
    default: true
  },
  hoverHighlight: {
    type: Boolean,
    default: true
  },
  autoClose: {
    type: Boolean,
    default: false
  },
  cssClasses: {
    type: String,
    required: false
  },
  items: {
    type: Array as () => MenuItem[],
    required: false
  },
  footerItems: {
    type: Array as () => MenuItem[],
    required: false
  }
})

const emit = defineEmits(['close'])

const $slots = useSlots()
const list = ref(null)
const footer = ref(null)
const filter = ref('')
const selected = ref(null)
const currentSubmenu = ref(null)
const chevronTemplate = ref(null)
const submenuStack = ref([]) // Navigation stack for multi-level submenus (slot-based)
const position = ref(null)

// Data-driven menu state
const dataSubmenuStack = ref<MenuItem[]>([]) // Stack of MenuItem objects for navigation
const currentDataItems = ref<MenuItem[] | null>(null) // Current level of items being displayed

const shouldShowCurrentFilter = computed(() => {
  // Data-driven mode
  if (props.items && dataSubmenuStack.value.length > 0) {
    const currentSubmenuItem = dataSubmenuStack.value[dataSubmenuStack.value.length - 1]
    return currentSubmenuItem.showFilter ?? false
  }

  // Slot-based mode
  if (!currentSubmenu.value) {
    return props.showFilter
  }
  // For submenus, we'll check if the slot was rendered with withFilter: true
  return currentSubmenuHasFilter.value
})

const currentSubmenuHasFilter = ref(false)

const hasFooter = computed(() => {
  // Data-driven mode
  if (props.items && currentDataFooter.value && currentDataFooter.value.length) {
    return true
  }
  // Slot-based mode
  if (!currentSubmenu.value) {
    return !!$slots.footer
  }
  return !!$slots[`${currentSubmenu.value}Footer`]
})

// Computed property for current footer items in data-driven mode
const currentDataFooter = computed(() => {
  if (!props.items) return null

  // If we're in a submenu, get the footer from the current submenu item
  if (dataSubmenuStack.value.length > 0) {
    const currentItem = dataSubmenuStack.value[dataSubmenuStack.value.length - 1]
    return currentItem.footer || null
  }

  // At root level, use footerItems prop if provided
  return props.footerItems || null
})

// Handler for data-driven item clicks
const handleDataItemClick = (item: MenuItem) => {
  if (item.disabled) return

  if (item.submenu && item.submenu.length > 0) {
    // Navigate to submenu
    dataSubmenuStack.value.push(item)
    currentDataItems.value = item.submenu
    filter.value = '' // Clear filter when entering submenu
  } else if (item.onClick) {
    // Execute click handler
    item.onClick()
    if (props.autoClose) {
      emit('close')
    }
  }
}

// Handler for going back in data-driven mode
const goBackData = () => {
  if (dataSubmenuStack.value.length > 0) {
    dataSubmenuStack.value.pop()
    filter.value = '' // Clear filter when going back

    if (dataSubmenuStack.value.length === 0) {
      // Back to root
      currentDataItems.value = null
    } else {
      // Back to parent submenu - need to rebuild path through CURRENT items
      // This ensures we get the updated MenuItem objects with fresh checkbox states
      let current: MenuItem[] | undefined = props.items
      for (const stackItem of dataSubmenuStack.value) {
        const found = current?.find(item => item.id === stackItem.id)
        if (found?.submenu) {
          current = found.submenu
        } else {
          // Path no longer exists, go to root
          currentDataItems.value = null
          dataSubmenuStack.value = []
          return
        }
      }

      currentDataItems.value = current || null
    }
  }
}

const calculatePosition = () => {
  // Mouse coordinate mode
  if (props.mouseX !== undefined && props.mouseY !== undefined) {
    position.value = { left: props.mouseX + 'px', top: props.mouseY + 'px' }
    return
  }

  // Anchor mode - query for element
  const anchorElement = props.anchor ? document.querySelector(props.anchor) : null

  if (!anchorElement) {
    // Fallback to center of window if anchor not found
    console.warn(`ContextMenuPlus: Anchor element not found: ${props.anchor}`)
    position.value = {
      left: `${window.innerWidth / 2}px`,
      top: `${window.innerHeight / 2}px`,
      transform: 'translate(-50%, -50%)'
    }
    return
  }

  const rect = anchorElement.getBoundingClientRect()
  const scrollX = window.scrollX || document.documentElement.scrollLeft
  const scrollY = window.scrollY || document.documentElement.scrollTop

  const x = rect.left + scrollX
  const y = rect.top + scrollY
  const width = rect.width
  const height = rect.height

  switch (props.position) {
    case 'above':
      // Center menu above anchor
      // Use two-phase positioning to handle dynamic menu width

      // Phase 1: Initial positioning with estimated width
      const estimatedWidth = 270 // Standard menu width from CSS
      const initialCenterX = x + (width / 2) - (estimatedWidth / 2)
      position.value = {
        left: Math.max(0, initialCenterX) + 'px',
        bottom: (window.innerHeight - y + 8) + 'px'
      }

      // Phase 2: Refine after render with actual width
      nextTick(() => {
        const menuElement = document.querySelector('.context-menu')
        if (menuElement) {
          const actualWidth = menuElement.getBoundingClientRect().width
          const refinedCenterX = x + (width / 2) - (actualWidth / 2)
          position.value = {
            left: Math.max(0, refinedCenterX) + 'px',
            bottom: (window.innerHeight - y + 8) + 'px'
          }
        }
      })
      break
    case 'above-right':
      position.value = { right: (window.innerWidth - x - width) + 'px', bottom: (window.innerHeight - y + 8) + 'px' }
      break
    case 'above-left':
      position.value = { left: x + 'px', bottom: (window.innerHeight - y + 8) + 'px' }
      break
    case 'right':
      position.value = { left: (x + width) + 'px', top: y + 'px' }
      break
    case 'left':
      position.value = { right: (window.innerWidth - x) + 'px', top: y + 'px' }
      break
    case 'below-right':
      position.value = { right: (window.innerWidth - x - width) + 'px', top: (y + height) + 'px' }
      break
    case 'below-left':
      position.value = { left: x + 'px', top: (y + height) + 'px' }
      break
    case 'below':
    default:
      position.value = { left: x + 'px', top: (y + height) + 'px' }
  }
}


onMounted(() => {
  // Reset navigation stack when component mounts
  submenuStack.value = []
  currentSubmenu.value = null

  // Calculate position after DOM is ready
  // In test mode, do it synchronously; otherwise use requestAnimationFrame for better timing
  const isTestMode = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'

  const initMenu = () => {
    calculatePosition()

    if (shouldShowCurrentFilter.value) {
      nextTick(() => {
        const input = document.querySelector<HTMLElement>('.context-menu input')
        input?.focus()
      })
    }

    // Add classes, chevron icons and event listeners after content is rendered
    // Skip for data-driven mode (items already have proper classes)
    if (!props.items) {
      nextTick(() => {
        addClasses()
        addChevronIcons()
        addEventListeners()
      })
    }
  }

  if (isTestMode) {
    initMenu()
  } else {
    requestAnimationFrame(initMenu)
  }

  onDomEvent(document, 'keydown', onKeyUp)
  onDomEvent(document, 'keyup', onKeyDown)
})

// Watch for items changes and update currentDataItems if in a submenu
watch(() => props.items, (newItems) => {
  if (!newItems || !currentDataItems.value || dataSubmenuStack.value.length === 0) return

  // Rebuild the currentDataItems path by traversing the new items structure
  let current: MenuItem[] | undefined = newItems
  for (const stackItem of dataSubmenuStack.value) {
    const found = current?.find(item => item.id === stackItem.id)
    if (found?.submenu) {
      current = found.submenu
    } else {
      // Path no longer exists, go back to root
      currentDataItems.value = null
      dataSubmenuStack.value = []
      return
    }
  }

  // Update currentDataItems with the new submenu reference
  currentDataItems.value = current || null
}, { deep: true })

// Watch for filter changes and apply filtering
watch(filter, (newFilter) => {
  nextTick(() => {
    applyFilter(newFilter)
  })
})

// Watch for content changes to add classes, chevron icons and event listeners
// Only for slot-based mode
watch([currentSubmenu], () => {
  if (!props.items) {
    nextTick(() => {
      addClasses()
      addChevronIcons()
      addEventListeners()
    })
  }
}, { flush: 'post' })

// Watch for selected changes to apply/remove the selected class
watch(selected, (newSelected, oldSelected) => {
  if (oldSelected) {
    oldSelected.classList.remove('selected')
  }
  if (newSelected) {
    newSelected.classList.add('selected')
  }
})


const applyFilter = (filterText: string) => {
  if (!list.value) return
  
  const items = list.value.querySelectorAll('.item:not(.back-item)')
  
  items.forEach((item: HTMLElement) => {
    if (!filterText.trim()) {
      // Show all items when no filter
      item.style.display = ''
      return
    }
    
    // Get the text content of the item, excluding icons
    const textContent = item.textContent || ''
    const shouldShow = textContent.toLowerCase().includes(filterText.toLowerCase())
    
    item.style.display = shouldShow ? '' : 'none'
  })
}

const addClasses = () => {
  const processItems = (potentialItems: NodeListOf<HTMLElement>) => {
    potentialItems.forEach((element: HTMLElement) => {
      // Skip wrapper divs and other structural elements
      if (!element.textContent?.trim() && !element.classList.contains('separator')) return
      
      // Skip if it's a container div (has only other divs as children)
      const hasOnlyDivChildren = Array.from(element.children).every(child => child.tagName === 'DIV')
      if (hasOnlyDivChildren && element.children.length > 0) return
      
      // Add the item class to actual menu items
      element.classList.add('item')
    })
  }
  
  // Process items in the main actions area
  if (list.value) {
    processItems(list.value.querySelectorAll('.actions > *:not(.item)'))
  }
  
  // Process items in the footer area
  if (footer.value) {
    processItems(footer.value.querySelectorAll('.footer > *:not(.item)'))
  }
}

const addChevronIcons = () => {
  if (!list.value || !chevronTemplate.value) return
  
  const items = list.value.querySelectorAll('.item[data-submenu-slot]')
  
  items.forEach((item: HTMLElement) => {
    // Check if chevron already exists
    if (item.querySelector('.chevron-icon')) return
    
    // Clone the hidden BIconChevronRight component
    const chevronElement = chevronTemplate.value.$el || chevronTemplate.value
    if (chevronElement) {
      const clonedChevron = chevronElement.cloneNode(true) as HTMLElement
      clonedChevron.style.display = '' // Remove the hidden style
      clonedChevron.classList.add('chevron-icon')
      clonedChevron.classList.remove('chevron-template')
      
      // Add to item
      item.appendChild(clonedChevron)
    }
  })
}

const addEventListeners = () => {
  const processItems = (container: HTMLElement) => {
    if (!container) return
    
    const items = container.querySelectorAll('.item')
    
    items.forEach((item: HTMLElement) => {
      // Skip if already has listeners (check for a data attribute we set)
      if (item.hasAttribute('data-listeners-added')) return
      
      // Add hover listener for all items
      item.addEventListener('mousemove', (event) => {
        onItemHover(event)
      })
      
      // Add click listener for submenu items
      if (item.hasAttribute('data-submenu-slot')) {
        item.addEventListener('click', (event) => {
          onItemClick(event)
        })
      }

      // Add auto-close listener
      if (props.autoClose) {
        item.addEventListener('click', () => {
          if (!item.classList.contains('separator') && !item.classList.contains('disabled')) {
            emit('close')
          }
        })
      }

      // Mark as processed
      item.setAttribute('data-listeners-added', 'true')
    })
  }
  
  // Process items in the main actions area
  if (list.value) {
    processItems(list.value)
  }
  
  // Process items in the footer area
  if (footer.value) {
    processItems(footer.value)
  }
}

const onOverlay = (event: MouseEvent) => {

  // Close the menu (removes overlay via v-if)
  emit('close')

  // if no event done
  if (!event) return

  // After overlay is removed, dispatch click to element below
  nextTick(() => {
    try {
      const x = event.clientX
      const y = event.clientY
      const elementBelow = document.elementFromPoint(x, y)
      elementBelow?.dispatchEvent(new MouseEvent(event.type, {
        button: event.button,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      }))
    } catch (error) {
      console.error('ContextMenuPlus: Error dispatching click to element below overlay:', error)
    }
  })
}

const onItemClick = (event: Event) => {
  const target = event.target as HTMLElement
  const item = target.closest('.item') as HTMLElement
  
  if (item?.hasAttribute('data-submenu-slot')) {
    event.stopPropagation()
    showSubmenu(item)
  }
}

const onItemHover = (event: Event) => {
  const target = event.target as HTMLElement
  const item = target.closest('.item') as HTMLElement | null

  // Only apply selection if hoverHighlight is enabled and item is not separator/disabled
  if (props.hoverHighlight && item && !item.classList.contains('separator') && !item.classList.contains('disabled')) {
    selected.value = item
    ensureVisible()
  } else if (!props.hoverHighlight) {
    selected.value = null
  }
}

const showSubmenu = (item: HTMLElement) => {
  const submenuSlot = item.getAttribute('data-submenu-slot')
  if (submenuSlot) {
    // Push current submenu to stack before navigating
    if (currentSubmenu.value) {
      submenuStack.value.push(currentSubmenu.value)
    }
    currentSubmenu.value = submenuSlot
    selected.value = null
    currentSubmenuHasFilter.value = false // Reset filter flag
  }
}

const setSubmenuFilter = (hasFilter: boolean) => {
  currentSubmenuHasFilter.value = hasFilter
}

const goBack = () => {
  // Data-driven mode
  if (props.items) {
    goBackData()
    return
  }

  // Slot-based mode (original behavior)
  if (submenuStack.value.length > 0) {
    currentSubmenu.value = submenuStack.value.pop()
  } else {
    currentSubmenu.value = null
  }
  selected.value = null
  filter.value = '' // Clear filter when going back
  currentSubmenuHasFilter.value = false
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    navigateVertical(event.key === 'ArrowDown', list.value, selected)
  } else if (event.key === 'ArrowRight' && !currentSubmenu.value) {
    event.preventDefault()
    const item = selected.value
    if (item?.hasAttribute('data-submenu-slot')) {
      showSubmenu(item)
    }
  } else if (event.key === 'ArrowLeft' && currentSubmenu.value) {
    event.preventDefault()
    goBack()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const currentItem = selected.value
    if (currentItem) {
      currentItem.click()
    }
  }
}
 
const onKeyUp = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (currentSubmenu.value) {
      goBack()
    } else {
      emit('close')
    }
    event.preventDefault()
    event.stopPropagation()
    return false
  }
}

const navigateVertical = (down: boolean, listElement: HTMLElement, selectedRef: any) => {
  if (!listElement) return
  
  // Get items from both main actions and footer
  const mainItems = Array.from(listElement.querySelectorAll('.item:not(.disabled):not(.separator)')) as HTMLElement[]
  const footerItems = footer.value ? Array.from(footer.value.querySelectorAll('.item:not(.disabled):not(.separator)')) as HTMLElement[] : []
  
  const items = [...mainItems, ...footerItems]
  if (items.length === 0) return
  
  const currentIndex = selectedRef.value ? items.indexOf(selectedRef.value) : -1
  
  if (currentIndex === -1) {
    selectedRef.value = items[0]
  } else {
    const nextIndex = down 
      ? (currentIndex + 1) % items.length
      : (currentIndex - 1 + items.length) % items.length
    selectedRef.value = items[nextIndex]
  }
  
  ensureVisible()
}

const ensureVisible = () => {
  nextTick(() => {
    const selectedEl = list.value?.querySelector('.selected') as HTMLElement
    if (selectedEl && list.value) {
      scrollToBeVisible(selectedEl, list.value)
    }
  })
}


const scrollToBeVisible = function (ele: HTMLElement, container: HTMLElement) {
  const eleTop = ele.offsetTop - container.offsetTop
  const eleBottom = eleTop + ele.clientHeight
  
  const containerTop = container.scrollTop
  const containerBottom = containerTop + container.clientHeight
  
  if (eleTop < containerTop) {
    container.scrollTop -= containerTop - eleTop
  } else if (eleBottom > containerBottom) {
    container.scrollTop += eleBottom - containerBottom
  }
}

const getVisibleItemIds = () => {
  if (!filter.value || !list.value) {
    return null
  }
  const visibleItems = Array.from(list.value.querySelectorAll('.item:not([style*="display: none"])'))
  return visibleItems.map((el: HTMLElement) => el.getAttribute('data-id'))
}

// Expose methods for testing
defineExpose({
  showSubmenu: (item: HTMLElement | string) => {
    if (typeof item === 'string') {
      // Directly set the submenu for testing
      currentSubmenu.value = item
      currentSubmenuHasFilter.value = false
    } else {
      showSubmenu(item)
    }
  },
  goBack,
  currentSubmenu: () => currentSubmenu.value,
  setCurrentSubmenu: (submenu: string) => {
    currentSubmenu.value = submenu
    currentSubmenuHasFilter.value = false
  },
  getVisibleItemIds
})

</script>

<style scoped>

.context-menu {
  position: absolute;
  background: var(--context-menu-bg-color);
  border: 1px solid var(--context-menu-border-color);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  max-width: 270px;
  min-width: 196px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  z-index: 1070;
  display: flex;
  flex-direction: column;
}

.context-menu.submenu {
  z-index: 51;
}

.context-menu .actions {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  margin: 0px !important;
  padding: var(--space-4);
  scrollbar-color: var(--scrollbar-thumb-color) var(--control-textarea-bg-color);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-8);
  border-bottom: 1px solid var(--context-menu-border-color);
  min-height: 32px;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--space-8);
  height: var(--space-8);
  cursor: pointer;
  color: var(--context-menu-text-color);
}

.filter-input {
  flex: 1;
}

.filter-input input {
  background-color: transparent;
  color: var(--context-menu-text-color);
  border: none;
  padding: var(--space-4) 0;
  font-size: var(--font-size-14);
  outline: none;
  min-width: 5rem;
  width: auto;
}

.filter-input input::placeholder {
  color: var(--context-menu-text-color);
  opacity: 0.3;
}

.back-label {
  flex: 1;
  color: var(--context-menu-text-color);
  font-size: var(--font-size-14);
  opacity: 0.8;
}

/* Global styles for menu items (to be used by slotted content) */
:deep(.item) {
  position: relative;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: var(--font-size-14);
  color: var(--context-menu-text-color);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-20);
  white-space: nowrap;
  overflow-x: clip;
  text-overflow: ellipsis;
}

:deep(.item.warning) {
  color: var(--color-warning);
}

:deep(.item.danger) {
  color: var(--color-error);
}

:deep(.item.wrap) {
  white-space: normal;
}

:deep(.item.separator) {
  cursor: default;
  padding: 0.25rem 0px;
}

:deep(.item.separator hr) {
  border-top-width: 0.5px;
  border-bottom-width: 0.5px;
  width: 100%;
  margin: 0;
}

:deep(.item span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.item .icon) {
  flex-shrink: 0;
  width: var(--icon-lg);
  height: var(--icon-lg);
}

:deep(.item .icon.text) {
  font-size: var(--font-size-14);
}

:deep(.item.disabled) {
  color: gray;
  cursor: default;
}

:deep(.item.selected) {
  background-color: var(--context-menu-selected-bg-color);
  color: var(--context-menu-selected-text-color);
  border-radius: 0.375rem;
  svg {
    stroke: var(--context-menu-selected-text-color);
  }
}

:deep(.item .chevron-icon) {
  flex-shrink: 0;
  margin-left: auto;
  padding-left: 1rem;
  display: flex;
  align-items: center;
  opacity: 0.6;
  color: var(--context-menu-text-color);
}

.footer:has(*) {
  border-top: 1px solid var(--context-menu-border-color);
  padding: 0.25rem 0rem;
}

.footer:has(.item) {
  padding: var(--space-2) var(--space-8);
  &:deep() .item {
    padding-left: 0;
    padding-right: 0;
    gap: 0.5rem;
  }
}

/* Hide footer border when actions has no visible items */
.actions:not(:has(.item:not([style*="display: none"]))) + .footer {
  border-top: none;
}

/* Footer button styling */
:deep(.footer-select) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
}

</style>
