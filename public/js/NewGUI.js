import { GameState } from './GameState.js';

class NewGUI {
  constructor(gameState, canvas) {
    this.gameState = gameState;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
  }

  createMenu(x, y, width, height, options) {
    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.width = `${width}px`;
    menu.style.height = `${height}px`;
    menu.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    menu.style.color = 'white';
    menu.style.padding = '10px';
    menu.style.borderRadius = '5px';
    options.forEach(option => {
      const button = this.createButton(option.text, option.callback);
      menu.appendChild(button);
    });
    document.body.appendChild(menu);
    return menu;
  }

  createButton(text, callback) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', callback);
    return button;
  }

  render() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Render game state...
  }
}

export { NewGUI };
