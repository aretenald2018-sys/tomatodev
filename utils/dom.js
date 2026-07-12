// ================================================================
// utils/dom.js — DOM 조작 유틸리티 함수
// ================================================================

import { closeModal as closeOverlayModal, openModal as openOverlayModal } from '../app/overlay-stack.js';

/**
 * ID로 요소 찾기 (document.getElementById 단축)
 */
export const $ = (id) => document.getElementById(id);

/**
 * 요소의 텍스트 내용 설정
 */
export function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

/**
 * 요소의 값 설정 (input, select 등)
 */
export function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

/**
 * 요소의 값 가져오기
 */
export function getValue(id) {
  const el = $(id);
  return el ? el.value : '';
}

/**
 * 요소에 CSS 클래스 추가
 */
export function addClass(id, className) {
  const el = $(id);
  if (el) el.classList.add(className);
}

/**
 * 요소에서 CSS 클래스 제거
 */
export function removeClass(id, className) {
  const el = $(id);
  if (el) el.classList.remove(className);
}

/**
 * 요소의 CSS 클래스 토글
 */
export function toggleClass(id, className, force) {
  const el = $(id);
  if (el) el.classList.toggle(className, force);
}

/**
 * 요소에 CSS 클래스가 있는지 확인
 */
export function hasClass(id, className) {
  const el = $(id);
  return el ? el.classList.contains(className) : false;
}

/**
 * 요소의 스타일 display 속성 설정
 */
export function setDisplay(id, display = 'block') {
  const el = $(id);
  if (el) el.style.display = display;
}

/**
 * 모달 열기
 */
export function openModal(id) {
  return openOverlayModal(id);
}

/**
 * 모달 닫기
 */
export function closeModal(id) {
  return closeOverlayModal(id);
}

/**
 * 모달이 클릭으로 닫기 가능한지 확인 (overlay 클릭)
 */
export function isModalClickClose(e, modalId) {
  if (!e) return false;
  return e.target === $(modalId);
}

/**
 * 요소의 innerHTML 설정
 */
export function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

/**
 * 여러 요소의 클래스 토글 (active 등)
 */
export function setActiveClass(selector, activeElement, className = 'active') {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.toggle(className, el === activeElement);
  });
}

/**
 * 특정 selector의 모든 요소에서 클래스 제거
 */
export function removeClassFromAll(selector, className) {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.remove(className);
  });
}

/**
 * 요소가 존재하는지 확인
 */
export function elementExists(id) {
  return !!$(id);
}

/**
 * 요소에 속성 설정
 */
export function setAttribute(id, attr, value) {
  const el = $(id);
  if (el) el.setAttribute(attr, value);
}

/**
 * 요소의 속성 값 가져오기
 */
export function getAttribute(id, attr) {
  const el = $(id);
  return el ? el.getAttribute(attr) : null;
}
