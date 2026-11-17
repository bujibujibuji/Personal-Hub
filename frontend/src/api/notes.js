// 笔记 CRUD API。
import { apiJson } from './request'

export function listNotes() {
  return apiJson('/api/notes')
}

export function getNote(id) {
  return apiJson(`/api/notes/${id}`)
}

export function createNote(note) {
  return apiJson('/api/notes', { method: 'POST', data: note })
}

export function updateNote(id, note) {
  return apiJson(`/api/notes/${id}`, { method: 'PUT', data: note })
}

export function deleteNote(id) {
  return apiJson(`/api/notes/${id}`, { method: 'DELETE' })
}
