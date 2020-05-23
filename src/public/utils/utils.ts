export function tweetIt(text: string, url: string = "", hashtag: string = "") {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  const h = encodeURIComponent(hashtag);
  const tweetUrl = `https://twitter.com/share?text=${t}&url=${u}&hashtags=${h}`;
  window.open(tweetUrl);
}

export function shareOnFacebook(url: string) {
  const u = encodeURIComponent(url);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, 'facebook-share-dialog', 'width=626,height=436');
}

export function isIOS() {
  const val = /iPad|iPhone|iPod/.test(navigator.platform)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return val;
}

export const debounce = (func: Function, delay: number) => {
  let debounceTimer
  return function () {
    const context = this
    const args = arguments
    clearTimeout(debounceTimer)
    debounceTimer
      = setTimeout(() => func.apply(context, args), delay)
  }
}