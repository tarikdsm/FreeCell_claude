import './ui/styles/main.css';
import { App } from './app/App';

const root = document.getElementById('game-root');
if (!root) throw new Error('Missing #game-root element');

new App(root);
