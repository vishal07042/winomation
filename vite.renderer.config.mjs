// import { defineConfig } from 'vite';

// // https://vitejs.dev/config
// export default defineConfig({});



import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
    plugins: [react()],
});
