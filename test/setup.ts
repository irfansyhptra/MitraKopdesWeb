import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// DOM dibersihkan antar tes supaya query tidak menemukan sisa render
// sebelumnya dan lolos karena alasan yang salah.
afterEach(cleanup);
