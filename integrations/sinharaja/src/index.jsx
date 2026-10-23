import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App.js';
class GameBoundary extends React.Component {
  state={error:false};
  static getDerivedStateFromError(){return {error:true}}
  componentDidCatch(error){console.error('Sinharaja could not start:',error)}
  render(){return this.state.error?<main style={{padding:32,color:'#eee',background:'#081108',minHeight:'100vh',fontFamily:'system-ui'}}><h1>森林探险暂时无法启动</h1><p>请刷新重试；浏览器需支持 WebGL 2 并开启硬件加速。若仍失败，请查看浏览器控制台。</p><a style={{color:'#9bd48a'}} href="/">返回 Loud 首页</a></main>:this.props.children}
}
createRoot(document.getElementById('root')).render(<GameBoundary><App /></GameBoundary>);
