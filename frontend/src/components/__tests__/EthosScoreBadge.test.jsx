import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ethosService from '../../services/ethosService';
import EthosScoreBadge from '../EthosScoreBadge';

vi.mock('../../services/ethosService');

describe('EthosScoreBadge Component', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    ethosService.getEthosScore = vi.fn(() => new Promise(() => { }));

    const { container } = render(<EthosScoreBadge address={mockAddress} />);

    const loadingSpinner = container.querySelector('.loading-spinner');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should render score badge after loading', async () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 1500,
      level: {
        name: 'Reputable',
        color: '#10b981',
        emoji: '✅'
      },
      hasScore: true
    });

    render(<EthosScoreBadge address={mockAddress} size="medium" />);

    await waitFor(() => {
      expect(screen.getByText('REPUTABLE')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show "New User" badge for users without score', async () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 0,
      level: {
        name: 'New',
        color: '#6b7280',
        emoji: '👤'
      },
      hasScore: false
    });

    render(<EthosScoreBadge address={mockAddress} showDetails={true} />);

    await waitFor(() => {
      expect(screen.getByText('New User')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    ethosService.getEthosScore = vi.fn().mockRejectedValue(new Error('API Error'));

    render(<EthosScoreBadge address={mockAddress} />);

    await waitFor(() => {
      expect(screen.queryByText('REPUTABLE')).not.toBeInTheDocument();
    });
  });

  it('should return null if no address provided', () => {
    render(<EthosScoreBadge address={null} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
