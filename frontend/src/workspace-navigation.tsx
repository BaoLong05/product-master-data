import { createElement, type ReactNode } from 'react'

export type WorkspaceView = 'catalog' | 'import'

type WorkspaceNavigationProps = {
  activeView: WorkspaceView
  labels: { navigation: string; catalog: string; import: string }
  onSelect: (view: WorkspaceView) => void
}

export function WorkspaceNavigation({ activeView, labels, onSelect }: WorkspaceNavigationProps) {
  return createElement('nav', { className: 'workspace-nav', 'aria-label': labels.navigation },
    createElement('button', {
      className: 'workspace-tab',
      type: 'button',
      'aria-current': activeView === 'catalog' ? 'page' : undefined,
      onClick: () => onSelect('catalog'),
    }, labels.catalog),
    createElement('button', {
      className: 'workspace-tab',
      type: 'button',
      'aria-current': activeView === 'import' ? 'page' : undefined,
      onClick: () => onSelect('import'),
    }, labels.import),
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
