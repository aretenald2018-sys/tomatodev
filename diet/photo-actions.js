import { removeDietPhoto } from './photo-store.js';

export async function removeMealPhoto(meal) {
  removeDietPhoto(meal);
  const { _renderMealPhotos } = await import('../workout/render.js');
  _renderMealPhotos();
  if (meal === 'workout') {
    const { saveWorkoutDay } = await import('../workout/save.js');
    await saveWorkoutDay();
    return;
  }
  const { _autoSaveDiet } = await import('../workout/save.js');
  await _autoSaveDiet({ meal });
}
