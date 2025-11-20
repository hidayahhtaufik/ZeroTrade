import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as ethosService from '../../services/ethosService';
import UserCard from '../UserCard';

vi.mock('../../services/ethosService');

describe('UserCard Component', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';

  it('should render user card with address', () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 1500,
      level: {
        name: 'Reputable',
        color: '#10b981',
        emoji: '✅'
      },
      hasScore: true
    });

    render(<UserCard address={mockAddress} />);

    expect(screen.getByText(/0x1234/)).toBeInTheDocument();
  });

  it('should return null if no address provided', () => {
    const { container } = render(<UserCard address={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display Ethos badge', async () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 1200,
      level: {
        name: 'Reputable',
        color: '#10b981',
        emoji: '✅'
      },
      hasScore: true
    });

    render(<UserCard address={mockAddress} />);

    // Wait for the EthosScoreBadge to load and display
    await waitFor(() => {
      const badge = screen.getByText('REPUTABLE');
      expect(badge).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
