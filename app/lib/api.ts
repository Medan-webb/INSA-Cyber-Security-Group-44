export const apiBase = "http://127.0.0.1:5000"


export async function fetchJSON(url: string, options?: RequestInit) {
try {
const res = await fetch(url, options)
if (!res.ok) {
const t = await res.text()
throw new Error(`${res.status} ${res.statusText} - ${t}`)
}
return await res.json()
} catch (e) {
console.error(e)
throw e
}
}