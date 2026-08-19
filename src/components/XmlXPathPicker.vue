<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select'])

const fileInput = ref(null)
const nodes = ref([])
const selectedPath = ref('')
const selectedLabel = ref('')
const parseError = ref(null)
const isDragging = ref(false)

function getLocalName(node) {
  return node.localName || node.nodeName.replace(/^.*:/, '')
}

function buildXPath(node) {
  if (node.nodeType === Node.ATTRIBUTE_NODE) {
    const parent = node.ownerElement
    if (parent === parent.ownerDocument.documentElement) return `./@${node.localName}`
    return `${buildXPath(parent)}/@${node.localName}`
  }

  const parts = []
  let current = node
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const localName = getLocalName(current)
    let tag = current.namespaceURI ? `{${current.namespaceURI}}${localName}` : localName

    if (current.hasAttribute('atributo')) {
      tag += `[@atributo='${current.getAttribute('atributo')}']`
    } else if (current.hasAttribute('name')) {
      tag += `[@name='${current.getAttribute('name')}']`
    } else if (current.hasAttribute('id')) {
      tag += `[@id='${current.getAttribute('id')}']`
    }

    parts.unshift(tag)
    current = current.parentElement
  }

  return `.//${parts.slice(1).join('/')}`
}

function buildNodes(element, depth = 0, result = []) {
  const text = element.children.length === 0 ? element.textContent.trim() : ''
  result.push({
    id: `element-${result.length}`,
    label: `<${element.tagName}>`,
    preview: text ? text.slice(0, 60) : '',
    path: buildXPath(element),
    depth,
  })

  for (const attribute of element.attributes) {
    if (attribute.name.startsWith('xmlns')) continue
    result.push({
      id: `attribute-${result.length}`,
      label: `@${attribute.name}`,
      preview: attribute.value.slice(0, 60),
      path: buildXPath(attribute),
      depth: depth + 1,
    })
  }

  for (const child of element.children) buildNodes(child, depth + 1, result)
  return result
}

function parseXml(text) {
  const document = new DOMParser().parseFromString(text, 'application/xml')
  const error = document.querySelector('parsererror')
  if (error) throw new Error('El archivo no contiene XML válido.')
  return buildNodes(document.documentElement)
}

function loadFile(file) {
  if (!file) return
  parseError.value = null
  selectedPath.value = ''
  selectedLabel.value = ''

  const reader = new FileReader()
  reader.onload = () => {
    try {
      nodes.value = parseXml(reader.result)
    } catch (error) {
      nodes.value = []
      parseError.value = error.message
    }
  }
  reader.readAsText(file, 'utf-8')
}

function handleFileChange(event) {
  loadFile(event.target.files[0])
  event.target.value = ''
}

function handleDrop(event) {
  isDragging.value = false
  loadFile(event.dataTransfer.files[0])
}

function selectNode(node) {
  selectedPath.value = node.path
  selectedLabel.value = node.label
  emit('select', node.path)
}
</script>

<template>
  <div class="xml-picker">
    <p class="xml-picker__hint">
      Carga un XML y selecciona el nodo o atributo del que se extraerá el valor.
    </p>

    <div
      class="drop-zone"
      :class="{ 'drop-zone--active': isDragging }"
      @click="fileInput.click()"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input ref="fileInput" type="file" accept=".xml,text/xml,application/xml" @change="handleFileChange" />
      <strong>Cargar XML para obtener XPath</strong>
      <span>Haz clic o arrastra el archivo aquí.</span>
    </div>

    <p v-if="parseError" class="state state--error">{{ parseError }}</p>

    <template v-if="nodes.length">
      <div class="selection-card">
        <span class="selection-card__label">Selección actual</span>
        <code :class="{ 'selection-card__path--empty': !selectedPath }">
          {{ selectedPath || 'Selecciona un nodo o atributo' }}
        </code>
        <span v-if="selectedLabel" class="selection-card__meta">{{ selectedLabel }}</span>
      </div>

      <div class="tree" aria-label="Árbol del XML">
        <button
          v-for="node in nodes"
          :key="node.id"
          class="tree__node"
          :class="{ 'tree__node--selected': node.path === selectedPath }"
          type="button"
          :style="{ paddingLeft: `${node.depth * 16 + 10}px` }"
          @click="selectNode(node)"
        >
          <span class="tree__label">{{ node.label }}</span>
          <span v-if="node.preview" class="tree__preview">{{ node.preview }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.xml-picker { display: flex; flex-direction: column; gap: var(--space-3); }
.xml-picker__hint { margin: 0; font-size: var(--text-sm); color: var(--color-gray-500); }
.drop-zone { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); padding: var(--space-5); border: 2px dashed var(--color-gray-300); border-radius: var(--radius-md); color: var(--color-gray-500); cursor: pointer; text-align: center; font-size: var(--text-sm); }
.drop-zone strong { color: var(--color-navy-900); }
.drop-zone:hover, .drop-zone--active { background: var(--color-navy-50); border-color: var(--color-navy-700); }
.drop-zone input { display: none; }
.selection-card { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--color-gray-200); border-radius: var(--radius-md); background: var(--color-navy-50); }
.selection-card__label { font-size: var(--text-xs); font-weight: 600; color: var(--color-gray-500); text-transform: uppercase; }
.selection-card code { padding: var(--space-2); border: 1px solid var(--color-gray-200); border-radius: var(--radius-sm); background: var(--color-white); color: var(--color-gray-900); font-family: var(--font-mono); font-size: var(--text-xs); overflow-wrap: anywhere; }
.selection-card__path--empty { color: var(--color-gray-500) !important; }
.selection-card__meta { font-size: var(--text-xs); color: var(--color-gray-500); }
.tree { max-height: 320px; overflow: auto; padding: var(--space-2) 0; border: 1px solid var(--color-gray-200); border-radius: var(--radius-md); }
.tree__node { display: flex; width: 100%; gap: var(--space-2); border: 0; background: transparent; color: var(--color-gray-900); cursor: pointer; font-family: var(--font-mono); font-size: var(--text-xs); line-height: 1.5; padding-top: 4px; padding-right: var(--space-2); padding-bottom: 4px; text-align: left; }
.tree__node:hover { background: var(--color-navy-50); }
.tree__node--selected { background: var(--color-navy-50); color: var(--color-navy-700); }
.tree__label { color: inherit; flex-shrink: 0; }
.tree__preview { overflow: hidden; color: var(--color-gray-500); text-overflow: ellipsis; white-space: nowrap; }
.state { font-size: var(--text-sm); margin: 0; }.state--error { color: var(--color-danger); }
</style>
