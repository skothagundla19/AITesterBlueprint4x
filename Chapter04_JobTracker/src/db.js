import { openDB } from 'idb'

const DB_NAME = 'job-tracker-db'
const DB_VERSION = 1
const JOBS_STORE = 'jobs'
const RESUMES_STORE = 'resumes'

let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(JOBS_STORE)) {
          const jobStore = db.createObjectStore(JOBS_STORE, { keyPath: 'id' })
          jobStore.createIndex('status', 'status')
          jobStore.createIndex('company', 'company')
          jobStore.createIndex('dateApplied', 'dateApplied')
        }
        if (!db.objectStoreNames.contains(RESUMES_STORE)) {
          db.createObjectStore(RESUMES_STORE, { keyPath: 'name' })
        }
      },
    })
  }
  return dbPromise
}

export async function getAllJobs() {
  const db = await getDB()
  return db.getAll(JOBS_STORE)
}

export async function putJob(job) {
  const db = await getDB()
  await db.put(JOBS_STORE, job)
  return job
}

export async function deleteJob(id) {
  const db = await getDB()
  await db.delete(JOBS_STORE, id)
}

export async function getAllResumes() {
  const db = await getDB()
  const all = await db.getAll(RESUMES_STORE)
  return all.map((r) => r.name)
}

export async function addResumeName(name) {
  if (!name || !name.trim()) return
  const db = await getDB()
  await db.put(RESUMES_STORE, { name: name.trim() })
}

export async function replaceAllData({ jobs = [], resumes = [] }) {
  const db = await getDB()
  const tx = db.transaction([JOBS_STORE, RESUMES_STORE], 'readwrite')
  await tx.objectStore(JOBS_STORE).clear()
  await tx.objectStore(RESUMES_STORE).clear()
  for (const job of jobs) {
    await tx.objectStore(JOBS_STORE).put(job)
  }
  for (const name of resumes) {
    await tx.objectStore(RESUMES_STORE).put({ name })
  }
  await tx.done
}
