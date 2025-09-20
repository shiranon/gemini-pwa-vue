import { functionToolDefinitions } from './registry'

const collectDefaultEnabled = () => {
  return functionToolDefinitions
    .filter((definition) => {
      const name = definition.declaration.name
      if (!name) return false
      return definition.meta?.defaultEnabled ?? true
    })
    .map((definition) => definition.declaration.name as string)
}

const collectAllNames = () => {
  return functionToolDefinitions.map((definition) => definition.declaration.name).filter((name): name is string => typeof name === 'string' && name.length > 0)
}

export const defaultEnabledFunctionToolNames = Object.freeze(collectDefaultEnabled())

export const allFunctionToolNames = Object.freeze(collectAllNames())
