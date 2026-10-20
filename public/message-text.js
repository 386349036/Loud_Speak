// Render text safely; size only complete emoji graphemes, including ZWJ sequences.
function renderMessageText(element,text){
  const segments=new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(text);
  element.replaceChildren();
  for(const {segment} of segments){
    if(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(segment)){
      const emoji=document.createElement('span');emoji.className='message-emoji';emoji.textContent=segment;element.append(emoji);
    }else element.append(document.createTextNode(segment));
  }
}
