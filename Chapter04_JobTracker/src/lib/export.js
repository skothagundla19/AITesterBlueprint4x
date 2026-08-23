export function downloadJSON(data, filename = 'job-tracker-backup.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch (err) {
        reject(new Error('That file is not valid JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsText(file)
  })
}

export function daysSince(dateString) {
  if (!dateString) return null
  const then = new Date(dateString + 'T00:00:00')
  const now = new Date()
  const diff = Math.floor((now.setHours(0, 0, 0, 0) - then.setHours(0, 0, 0, 0)) / 86400000)
  return diff
}
