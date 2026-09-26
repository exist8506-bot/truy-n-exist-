const {chapterizeText,db}=require('./server');
try{
 const text='第一章 开始\nNội dung chương một.\n第二章 Tiếp tục\nNội dung chương hai.';
 const chapters=chapterizeText(text);
 if(chapters.length!==2)throw Error('Expected 2 Chinese chapters, got '+chapters.length);
 if(chapters[0].title!=='第一章 开始'||chapters[1].title!=='第二章 Tiếp tục')throw Error('Chinese chapter titles parsed incorrectly: '+JSON.stringify(chapters));
 if(!chapters[0].content.includes('Nội dung chương một.')||!chapters[1].content.includes('Nội dung chương hai.'))throw Error('Chinese chapter content split incorrectly: '+JSON.stringify(chapters));
 console.log('Chinese chapterize regression OK');
}finally{db.close()}
