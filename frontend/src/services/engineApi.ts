export const engineApi = {
  health: async () => {
    const response = await fetch('/api/v1/engine/health')
    return response.json()
  },
}
