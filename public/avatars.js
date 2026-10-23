// Native produce emoji plus local illustrated icons for produce without Unicode emoji.
const produceAvatars={
  '土豆':'🥔','番茄':'🍅','南瓜':'🎃','黄瓜':'🥒','胡萝卜':'🥕',
  '玉米':'🌽','红薯':'🍠','白菜':'🥬','青菜':'🥬','菠菜':'🥬','生菜':'🥬',
  '茄子':'🍆','辣椒':'🌶️','青椒':'🫑','西兰花':'🥦','豌豆':'🫛',
  '西瓜':'🍉','哈密瓜':'🍈','香瓜':'🍈','甜瓜':'🍈','芒果':'🥭',
  '草莓':'🍓','菠萝':'🍍','苹果':'🍎','橘子':'🍊','橙子':'🍊','柠檬':'🍋',
  '桃子':'🍑','葡萄':'🍇','香蕉':'🍌','梨子':'🍐','樱桃':'🍒','蓝莓':'🫐',
  '猕猴桃':'🥝','椰子':'🥥'
};
function nicknameAvatar(nick){
  const label=nick.includes('的')?nick.slice(nick.lastIndexOf('的')+1):'匿名';
  return {label,symbol:produceAvatars[label]||'🌱',image:produceIcons[label],isText:false};
}
const leaf='<path d="M30 17Q12 4 18 3Q35 2 33 16Q38 1 48 5Q48 16 33 18" fill="#57944c"/>';
const oval=(x,y,rx,ry,c)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
const stroke=(d,c='#548c44',w=3)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const fruit=(c,rx=20,ry=21)=>leaf+oval(32,36,rx,ry,c)+oval(24,29,4,7,'#ffffff35');
const pod=(c)=>`<path d="M10 48Q9 15 53 12Q54 49 10 48" fill="${c}"/>`+stroke('M16 43Q28 24 47 18','#c1da85',2);
const stalks=(c)=>stroke('M22 55L15 12M29 55L28 7M35 55L40 8M40 55L51 15',c,5);
const patterns={
 '白萝卜':leaf+'<path d="M20 20Q46 12 46 29Q43 48 29 59Q23 47 20 20" fill="#f8f4dc"/>'+stroke('M33 32L40 30M31 41L36 40','#ccc9ac',2),
 '芹菜':stalks('#91b957')+oval(16,12,9,7,'#4d9849')+oval(29,9,9,7,'#4d9849')+oval(47,13,9,7,'#4d9849'),
 '韭菜':stroke('M24 57Q24 22 10 5M29 57Q23 21 24 5M33 57Q37 17 39 4M37 57Q44 27 55 12','#478e48',5)+stroke('M30 56Q31 21 32 8','#7fac56',3),
 '冬瓜':oval(32,35,19,25,'#83a78b')+stroke('M23 18Q19 37 25 53M34 13L34 56M44 20Q48 37 42 51','#b7cbb0',2),
 '丝瓜':stroke('M44 7Q50 2 53 8','#598445',3)+'<path d="M39 10Q54 13 44 33L23 57Q12 60 11 49L30 18Z" fill="#80ab49"/>'+stroke('M40 17L19 51','#b7cd6b',3),
 '苦瓜':'<path d="M42 7Q57 14 42 36L22 58Q8 59 10 45L28 18Z" fill="#699e39"/>'+[0,1,2,3,4,5].map(i=>oval(34-i*3,18+i*6,5,4,i%2?'#8db748':'#4f882f')).join(''),
 '西葫芦':'<path d="M41 8L48 12L44 20L37 19Z" fill="#4d703a"/>'+'<path d="M37 17Q54 18 43 39L29 56Q13 64 12 47L28 23Z" fill="#729c43"/>'+stroke('M39 24L22 49','#aec16a',3),
 '花菜':stroke('M31 48L31 58','#7a9b48',7)+'<path d="M30 55Q7 52 9 29Q23 32 30 48Q40 30 56 29Q53 51 30 55" fill="#7b9e51"/>'+oval(21,28,13,13,'#eee9cf')+oval(43,28,13,13,'#eee9cf')+oval(32,20,14,14,'#faf5df'),
 '莲藕':oval(32,33,23,21,'#cba778')+oval(32,31,20,18,'#f4e3b9')+[ [23,23],[38,22],[20,35],[42,34],[30,41],[31,30] ].map(([x,y])=>oval(x,y,4,5,'#b58f64')).join(''),
 '山药':'<path d="M37 6Q48 8 43 20L28 57Q19 62 16 52L31 14Z" fill="#b49a75"/>'+stroke('M32 23L36 24M27 34L31 35M22 45L26 46','#806b52',2),
 '芋头':oval(32,36,20,24,'#9a7b65')+stroke('M15 26Q32 33 49 25M13 37Q32 44 51 35M18 49Q33 54 46 47','#c5ae96',3),
 '毛豆':pod('#80ab46')+oval(23,36,7,8,'#a7c75c')+oval(34,27,7,8,'#a7c75c')+oval(44,20,6,7,'#a7c75c'),
 '扁豆':pod('#8baf55'),
 '四季豆':stroke('M49 9Q32 10 30 30Q28 49 13 54','#5e9c48',9)+stroke('M48 9Q33 13 31 30Q27 49 14 54','#a0be62',2),
 '荔枝':fruit('#d86c73')+[ [20,29],[28,23],[40,29],[23,40],[35,43],[43,38],[32,33] ].map(([x,y])=>oval(x,y,2,2,'#f0a4a1')).join(''),
 '龙眼':oval(23,35,16,18,'#b39153')+oval(43,39,15,17,'#dac9a0')+oval(43,38,12,13,'#f4ead3')+oval(45,39,7,8,'#49382c')+oval(47,36,2,2,'#fff8e3'),
 '柚子':fruit('#d7be5e',23,23),
 '石榴': '<path d="M24 13L21 4L30 8L36 3L40 13" fill="#b34f43"/>'+oval(32,35,22,23,'#c85b50')+oval(25,29,4,7,'#e9987a'),
 '火龙果':'<path d="M20 15L13 5L31 13L43 5L44 20L57 25L48 36L51 49L37 52L26 60L21 49L9 43L16 31L9 20Z" fill="#639c4b"/>'+oval(32,35,19,23,'#dc608b')+stroke('M23 23L19 30M42 30L45 38M26 43L29 50','#f3a1b0',3),
 '柿子':leaf+oval(32,36,23,20,'#e99745')+'<path d="M32 21L19 15L24 25L15 28L30 29L39 24L49 17L36 20Z" fill="#648447"/>',
 '李子':fruit('#83517e'),
 '杏子':fruit('#edb65e',19,20)+stroke('M34 20Q25 35 33 52','#ce8d46',2),
 '杨梅':fruit('#ae5065')+Array.from({length:24},(_,i)=>{const a=i*2.4,r=4+Math.sqrt(i)*3;return oval(32+Math.cos(a)*r,36+Math.sin(a)*r,2.5,2.5,'#d4788b')}).join(''),
 '枇杷':leaf+oval(23,37,13,19,'#e9aa47')+oval(43,40,12,17,'#f0bd59')+stroke('M20 52L24 54M40 54L44 55','#9b753f',3),
 '木瓜':leaf+'<path d="M32 12Q43 13 49 33Q59 56 34 60Q7 60 14 38Q20 14 32 12" fill="#e9aa48"/>'+oval(33,39,11,17,'#f5c778')+oval(33,40,6,12,'#69543a')
};
const produceIcons=Object.fromEntries(Object.entries(patterns).map(([name,body])=>[name,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)]));
