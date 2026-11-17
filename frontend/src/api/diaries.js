// 日记 CRUD API。
import { apiJson } from './request'

export function listDiaries() {
  return apiJson('/api/diaries')
}

export function getDiary(id) {
  return apiJson(`/api/diaries/${id}`)
}

export function createDiary(diary) {
  return apiJson('/api/diaries', { method: 'POST', data: diary })
}

export function updateDiary(id, diary) {
  return apiJson(`/api/diaries/${id}`, { method: 'PUT', data: diary })
}

export function deleteDiary(id) {
  return apiJson(`/api/diaries/${id}`, { method: 'DELETE' })
}
