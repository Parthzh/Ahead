import { supabase } from '../queue-engine/supabase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('create-squad-btn');
  const joinForm = document.getElementById('join-form');
  const joinBtn = document.getElementById('join-button');
  const joinError = document.getElementById('join-error');
  const loginCard = document.getElementById('form-container');

  // Generate random 4-character code (A-Z, 0-9)
  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Handle Create Squad
  createBtn.addEventListener('click', async () => {
    createBtn.disabled = true;
    createBtn.innerHTML = 'Creating...';
    
    try {
      const code = generateCode();
      
      const { data, error } = await supabase
        .from('squad_sessions')
        .insert({ session_code: code, master_cart: [] })
        .select()
        .single();

      if (error) throw error;
      
      window.location.href = `app.html?session=${code}`;
      
    } catch (err) {
      console.error('Failed to create squad:', err);
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create New Squad Session';
      alert('Failed to create squad session. Did you run the SQL migration?');
    }
  });

  // Handle Join Squad
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = joinForm.code.value.trim().toUpperCase();
    
    if (!code) return;

    joinBtn.disabled = true;
    joinBtn.innerHTML = 'Joining...';
    joinError.hidden = true;
    loginCard.classList.remove('shake');

    try {
      const { data, error } = await supabase
        .from('squad_sessions')
        .select('*')
        .eq('session_code', code)
        .single();

      if (error || !data) {
        throw new Error('Invalid code');
      }

      window.location.href = `app.html?session=${code}`;
      
    } catch (err) {
      joinError.textContent = 'Invalid or expired squad code.';
      joinError.hidden = false;
      joinBtn.disabled = false;
      joinBtn.innerHTML = `Join Squad <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      
      void loginCard.offsetWidth;
      loginCard.classList.add('shake');
    }
  });
});
