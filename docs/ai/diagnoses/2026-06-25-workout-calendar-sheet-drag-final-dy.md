# 운동 캘린더 바텀시트 드래그 미정착 진단

## 상태

- 날짜: 2026-06-25
- 트리거: `/diagnose`
- 증상: 클릭은 full/bar 전환이 되지만, 드래그나 빠른 스와이프는 full에 안착하지 않고 되돌아감

## 근본 원인

`render-calendar.js`의 `_startWorkoutHomeSheetDrag()`는 release snap 판정에서 `lastDragY`만 사용한다.

```js
const dy = lastDragY;
```

`lastDragY`는 `pointermove`에서만 갱신된다. 모바일 브라우저에서 짧고 빠른 스와이프는 `pointermove`가 생략되거나 마지막 이동분이 `pointerup.clientY`에만 반영될 수 있다. 이 경우 사용자는 충분히 위로 밀었지만 코드상 이동량은 `0px` 또는 마지막 중간 이동량으로 남아 `deadzone`에 걸리고, 시트가 다시 `bar`로 남는다.

## 영향

- 짧은 클릭: click toggle 경로라 정상
- 천천히 충분히 끌기: pointermove가 많아 상대적으로 정상
- 빠른 스와이프/짧은 드래그: 최종 좌표가 무시되어 snap 실패

## 수정 방향

1. `pointerup`/`pointercancel`의 최종 `clientY`를 기준으로 final drag delta를 다시 계산한다.
2. final delta로 `openLatched`/`closeLatched`를 한 번 더 갱신한다.
3. `pointermove`는 passive가 아닌 리스너에서 `preventDefault()`를 호출해 모바일 스크롤 제스처와 경쟁하지 않게 한다.
4. 기존 click suppress는 유지해 drag 뒤 합성 click이 상태를 되돌리지 않게 한다.

## 완료 기준

- 빠른 위 스와이프도 `bar -> full`로 snap된다.
- 빠른 아래 스와이프도 `full -> bar`로 snap된다.
- click toggle 동작과 post-drag click suppress는 유지된다.
