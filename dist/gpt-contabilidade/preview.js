const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const playButton = document.querySelector('.preview-play');
const stillSource = document.querySelector('#preview-still');
if (motionPreference.matches && playButton && stillSource) {
  playButton.hidden = false;
  playButton.addEventListener('click', () => {
    stillSource.remove();
    playButton.hidden = true;
  });
}
