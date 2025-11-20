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
    ethosService.getEthosScore = vi.fn(() => new Promise(() => {})); // Never resolves

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
      expect(screen.getByText('1,500')).toBeInTheDocument();
      expect(screen.getByText('REPUTABLE')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display avatar image', async () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 1000,
      level: {
        name: 'Questionable',
        color: '#fbbf24',
        emoji: '⚠️'
      },
      hasScore: true
    });

    render(<EthosScoreBadge address={mockAddress} />);

    await waitFor(() => {
      const avatar = screen.getByAlt(/avatar/i);
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('crossorigin', 'anonymous');
    }, { timeout: 3000 });
  });

  it('should show address details when showDetails is true', async () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 2000,
      level: {
        name: 'Excellent',
        color: '#8b5cf6',
        emoji: '⭐'
      },
      hasScore: true
    });

    render(<EthosScoreBadge address={mockAddress} showDetails={true} />);

    await waitFor(() => {
      expect(screen.getByText(/0x1234\.\.\.7890/)).toBeInTheDocument();
    });
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

  it('should handle different size variants', async () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 1200,
      level: {
        name: 'Reputable',
        color: '#10b981',
        emoji: '✅'
      },
      hasScore: true
    });

    const { rerender } = render(<EthosScoreBadge address={mockAddress} size="tiny" />);
    await waitFor(() => {
      const container = screen.getByText('1,200').closest('.ethos-badge-container');
      expect(container).toHaveClass('tiny');
    });

    rerender(<EthosScoreBadge address={mockAddress} size="small" />);
    await waitFor(() => {
      const container = screen.getByText('1,200').closest('.ethos-badge-container');
      expect(container).toHaveClass('small');
    });

    rerender(<EthosScoreBadge address={mockAddress} size="large" />);
    await waitFor(() => {
      const container = screen.getByText('1,200').closest('.ethos-badge-container');
      expect(container).toHaveClass('large');
    });
  });

  it('should handle API errors gracefully', async () => {
    ethosService.getEthosScore = vi.fn().mockRejectedValue(new Error('API Error'));

    render(<EthosScoreBadge address={mockAddress} />);

    await waitFor(() => {
      // Component should not crash, just not display anything
      expect(screen.queryByText('REPUTABLE')).not.toBeInTheDocument();
    });
  });

  it('should return null if no address provided', () => {
    render(<EthosScoreBadge address={null} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should apply correct color styling based on level', async () => {
    ethosService.getEthosScore = vi.fn().mockResolvedValue({
      score: 1800,
      level: {
        name: 'Excellent',
        color: '#8b5cf6',
        emoji: '⭐'
      },
      hasScore: true
    });

    render(<EthosScoreBadge address={mockAddress} />);

    await waitFor(() => {
      const badge = screen.getByText('1,800').closest('.ethos-badge-simple');
      expect(badge).toHaveStyle({ borderColor: '#8b5cf6' });
    });
  });
});
