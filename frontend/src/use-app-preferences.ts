import { useContext } from 'react'
import { AppPreferencesContext } from './app-preferences-context'

export function useAppPreferences() {
  return useContext(AppPreferencesContext)
}
