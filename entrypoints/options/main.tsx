import { render } from 'preact';
import { App } from './App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('[options] #app root missing');
render(<App />, root);
