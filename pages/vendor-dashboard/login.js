import { supabase } from '../queue-engine/supabase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- Ambient Canvas Smoke Logic (identical to home page) ---
  const canvas = document.getElementById('smoke-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let isHovering = false;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const interactives = document.querySelectorAll('a, .btn, input');
  interactives.forEach(el => {
    el.addEventListener('mouseenter', () => isHovering = true);
    el.addEventListener('mouseleave', () => isHovering = false);
  });

  class Particle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 45 + 35; 
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8 - 0.5;
      this.life = 1.0;
      this.decay = Math.random() * 0.06 + 0.08; 
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.size += 1.5;
      this.life -= this.decay;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      const alpha = Math.max(0, this.life * 0.15); 
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      gradient.addColorStop(0, `rgba(165, 215, 175, ${alpha})`); 
      gradient.addColorStop(1, `rgba(165, 215, 175, 0)`);
      ctx.fillStyle = gradient;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animateSmoke() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    const coreSize = isHovering ? 130 : 90; 
    const coreGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, coreSize);
    coreGrad.addColorStop(0, `rgba(165, 215, 175, ${isHovering ? 0.25 : 0.15})`);
    coreGrad.addColorStop(1, `rgba(165, 215, 175, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.arc(mouseX, mouseY, coreSize, 0, Math.PI * 2);
    ctx.fill();

    particles.push(new Particle(mouseX + (Math.random()-0.5)*10, mouseY + (Math.random()-0.5)*10));

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw(ctx);
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
        i--;
      }
    }
    requestAnimationFrame(animateSmoke);
  }

  animateSmoke();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // --- Scroll Effect ---
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      document.body.classList.add('scrolled');
    } else {
      document.body.classList.remove('scrolled');
    }
  });

  // --- Authentication Logic ---
  const loginView = document.getElementById('login-view');
  const resetView = document.getElementById('reset-view');
  
  const loginForm = document.getElementById('login-form');
  const resetForm = document.getElementById('reset-form');
  
  const loginError = document.getElementById('login-error');
  const resetError = document.getElementById('reset-error');
  
  const loginButton = document.getElementById('login-button');
  const resetButton = document.getElementById('reset-button');
  
  const loginCard = document.getElementById('form-container');

  // Form Toggles
  document.getElementById('show-reset').addEventListener('click', () => {
    loginView.hidden = true;
    resetView.hidden = false;
    resetError.hidden = true;
  });

  document.getElementById('show-login').addEventListener('click', () => {
    resetView.hidden = true;
    loginView.hidden = false;
    loginError.hidden = true;
  });

  // Check if already authenticated
  if (sessionStorage.getItem('vendor_auth') === 'true') {
    window.location.href = 'index.html';
  }

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginForm.username.value.trim();
    const password = loginForm.password.value;

    if (!username || !password) return;

    loginButton.disabled = true;
    loginButton.innerHTML = 'Signing In...';
    loginError.hidden = true;
    loginCard.classList.remove('shake');

    try {
      const { data, error } = await supabase
        .from('vendor_credentials')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data || data.password !== password) {
        throw new Error('Invalid credentials');
      }

      sessionStorage.setItem('vendor_auth', 'true');
      
      loginButton.style.background = '#1d6f4f';
      loginButton.innerHTML = `Success <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
      
      setTimeout(() => { window.location.href = 'index.html'; }, 800);

    } catch (error) {
      loginError.textContent = 'Invalid username or password.';
      loginError.hidden = false;
      loginButton.disabled = false;
      loginButton.innerHTML = `Sign In <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      
      void loginCard.offsetWidth;
      loginCard.classList.add('shake');
    }
  });

  // Handle Reset Password
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = resetForm.username.value.trim();
    const password = resetForm.password.value;

    if (!username || !password) return;

    resetButton.disabled = true;
    resetButton.innerHTML = 'Updating...';
    resetError.hidden = true;
    loginCard.classList.remove('shake');

    try {
      // Check if user exists first
      const { data: user, error: fetchError } = await supabase
        .from('vendor_credentials')
        .select('username')
        .eq('username', username)
        .single();

      if (fetchError || !user) {
        throw new Error('Username not found');
      }

      // Update password
      const { error: updateError } = await supabase
        .from('vendor_credentials')
        .update({ password })
        .eq('username', username);

      if (updateError) throw updateError;

      resetButton.style.background = '#1d6f4f';
      resetButton.innerHTML = `Password Updated! <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
      
      setTimeout(() => {
        resetView.hidden = true;
        loginView.hidden = false;
        loginForm.username.value = username;
        loginForm.password.value = '';
        loginForm.password.focus();
        
        resetButton.style.background = '';
        resetButton.innerHTML = 'Update Password';
        resetButton.disabled = false;
        resetForm.reset();
      }, 1500);

    } catch (error) {
      resetError.textContent = 'Username not found or update failed.';
      resetError.hidden = false;
      resetButton.disabled = false;
      resetButton.innerHTML = 'Update Password';
      
      void loginCard.offsetWidth;
      loginCard.classList.add('shake');
    }
  });
});
