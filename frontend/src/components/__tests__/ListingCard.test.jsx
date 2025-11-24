import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ListingCard from '../ListingCard';

describe('ListingCard Component', () => {
  const mockListing = {
    id: 1,
    seller: '0x1234567890123456789012345678901234567890',
    title: 'Test NFT',
    description: 'Test Description',
    category: 'NFTs',
    imageUrl: '',
    tokenSymbol: 'ETH',
    fdv: '1000000000000000000000',
    dealType: 1,
    trancheSize: '100000',
    vestingMonths: 12,
    status: 0,
    createdAt: Math.floor(Date.now() / 1000),
    offersCount: 2,
    isOwner: false
  };

  const mockOnView = vi.fn();
  const mockOnMakeOffer = vi.fn();

  it('should render listing card with all information', () => {
    render(
      <ListingCard
        listing={mockListing}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={false}
      />
    );

    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('VESTING')).toBeInTheDocument();
    expect(screen.getByText(/2 offers/i)).toBeInTheDocument();
  });

  it('should show Make Offer button for non-owner on active listing', () => {
    render(
      <ListingCard
        listing={mockListing}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={false}
      />
    );

    const button = screen.getByText(/Make Offer/i);
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockOnMakeOffer).toHaveBeenCalledWith(mockListing);
  });

  it('should not show Make Offer button for sold listing', () => {
    render(
      <ListingCard
        listing={{ ...mockListing, status: 1 }}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={false}
      />
    );

    expect(screen.queryByText(/Make Offer/i)).not.toBeInTheDocument();
    expect(screen.getByText(/This item has been sold/i)).toBeInTheDocument();
  });

  it('should not show Make Offer button for owner', () => {
    render(
      <ListingCard
        listing={mockListing}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={true}
      />
    );

    expect(screen.queryByText(/Make Offer/i)).not.toBeInTheDocument();
  });

  it('should show SOLD overlay for sold listings', () => {
    render(
      <ListingCard
        listing={{ ...mockListing, status: 1 }}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={false}
      />
    );

    expect(screen.getByText('✅ SOLD')).toBeInTheDocument();
  });

  it('should call onView when card is clicked', () => {
    render(
      <ListingCard
        listing={mockListing}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={false}
      />
    );

    const card = screen.getByText('ETH').closest('.listing-card-opensea');
    fireEvent.click(card);

    expect(mockOnView).toHaveBeenCalledWith(mockListing);
  });

  it('should display uploaded image when imageUrl is provided', () => {
    const listingWithImage = {
      ...mockListing,
      imageUrl: 'data:image/png;base64,mockbase64string'
    };

    render(
      <ListingCard
        listing={listingWithImage}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={false}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,mockbase64string');
  });

  it('should show token icon when no image is provided', () => {
    render(
      <ListingCard
        listing={mockListing}
        onView={mockOnView}
        onMakeOffer={mockOnMakeOffer}
        isOwner={false}
      />
    );

    const tokenIcons = screen.getAllByText('E');
    expect(tokenIcons.length).toBeGreaterThan(0);
  });
});
