import { createElement, type ReactNode } from 'react'

export type WorkspaceView = 'catalog' | 'import'

type WorkspaceNavigationProps = {
  activeView: WorkspaceView
  labels: { navigation: string; section?: string; catalog: string; import: string }
  onSelect: (view: WorkspaceView) => void
}

export function WorkspaceNavigation({ activeView, labels, onSelect }: WorkspaceNavigationProps) {
  return createElement('nav', { className: 'workspace-nav', id: 'vault-sidebar-navigation', 'aria-label': labels.navigation },
    labels.section ? createElement('p', { className: 'workspace-nav-heading', 'aria-hidden': true }, labels.section) : null,
    createElement('button', {
      className: 'workspace-tab',
      type: 'button',
      'data-view': 'catalog',
      'aria-label': labels.catalog,
      'aria-current': activeView === 'catalog' ? 'page' : undefined,
      onClick: () => onSelect('catalog'),
    }, createElement('svg', { 'aria-hidden': true, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 },
      createElement('rect', { x: 3, y: 3.5, width: 14, height: 13, rx: 2 }),
      createElement('path', { d: 'M3 8h14M8 8v8.5' })),
    createElement('span', { className: 'workspace-tab-label' }, labels.catalog)),
    createElement('button', {
      className: 'workspace-tab',
      type: 'button',
      'data-view': 'import',
      'aria-label': labels.import,
      'aria-current': activeView === 'import' ? 'page' : undefined,
      onClick: () => onSelect('import'),
    }, createElement('svg', { 'aria-hidden': true, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 },
      createElement('path', { d: 'M10 2.75v9m0 0 3.25-3.25M10 11.75 6.75 8.5M3 13.25v2A1.75 1.75 0 0 0 4.75 17h10.5A1.75 1.75 0 0 0 17 15.25v-2' })),
    createElement('span', { className: 'workspace-tab-label' }, labels.import)),
  )
}

type WorkspacePanelProps = {
  activeView: WorkspaceView
  view: WorkspaceView
  className: string
  ariaLabel: string
  children: ReactNode
}

export function WorkspacePanel({ activeView, view, className, ariaLabel, children }: WorkspacePanelProps) {
  return createElement('section', { className, hidden: activeView !== view, 'aria-label': ariaLabel }, children)
}
