const ResearchInterestsControl = createClass({
	getInitialState() {
		return {
			value: this.props.value || [],
			availableTags: [],
			isPreview: window.location.pathname.includes('/preview/')
		};
	},

	async componentDidMount() {
		if (this.state.isPreview) {
			return;
		}

		try {
			const response = await fetch('/admin/data/global-tags.json');
			if (!response.ok) {
				throw new Error('Failed to fetch tags');
			}
			const data = await response.json();
			this.setState({ availableTags: (data.research_interests || []).sort().filter(Boolean) });
		} catch (error) {
			console.error('Error loading tags:', error);
			this.setState({ availableTags: [] });
		}
	},

	addInterest(interest) {
		if (!this.state.value.includes(interest)) {
			const newValue = [...this.state.value, interest].sort();
			this.setState({ value: newValue }, () => {
				this.props.onChange(newValue);
			});
		}
	},

	removeInterest(interest) {
		const newValue = this.state.value.filter((i) => i !== interest);
		this.setState({ value: newValue }, () => {
			this.props.onChange(newValue);
		});
	},

	handleCustomInterest(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			this.addCustomInterest();
		}
	},

	addCustomInterest() {
		const inputElement = document.querySelector('.custom-interest-input');
		const newInterest = inputElement.value.trim();

		// Limit interest length to 25 characters
		if (newInterest.length > 25) {
			alert('Interest text should be 25 characters or less');
			return;
		}

		if (newInterest) {
			// Just add to selected interests
			const newValue = [...this.state.value, newInterest].sort();
			this.setState({ value: newValue }, () => {
				this.props.onChange(newValue);
				inputElement.value = '';
			});
		}
	},

	render() {
		return h('div', { className: 'research-interests-widget' }, [
			h('h3', { className: 'widget-title' }, 'Research Interests'),

			// Selected Interests
			h('div', { className: 'selected-interests' }, [
				this.state.value.length > 0 && h('div', { className: 'section-label' }, 'Selected Interests:'),
				h(
					'div',
					{ className: 'selected-interests-grid' },
					this.state.value.map((interest) =>
						h(
							'button',
							{
								className: 'interest-item selected',
								key: interest,
								onClick: () => this.removeInterest(interest),
								title: interest
							},
							[
								h('span', {}, interest),
								!this.state.isPreview &&
									h(
										'span',
										{
											className: 'remove-icon',
											onClick: (e) => {
												e.stopPropagation();
												this.removeInterest(interest);
											}
										},
										'✕'
									)
							]
						)
					)
				)
			]),

			// Available Interests
			!this.state.isPreview &&
				h('div', { className: 'all-interests' }, [
					h('div', { className: 'section-label' }, 'Available Interests:'),
					h(
						'div',
						{ className: 'all-interests-grid' },
						this.state.availableTags
							.filter((interest) => !this.state.value.includes(interest))
							.map((interest) =>
								h(
									'button',
									{
										className: 'interest-item available',
										key: interest,
										onClick: () => this.addInterest(interest),
										title: interest
									},
									[h('span', {}, interest)]
								)
							)
					)
				]),

			// Custom Interest Input
			!this.state.isPreview &&
				h('div', { className: 'custom-interest-container' }, [
					h('input', {
						type: 'text',
						className: 'custom-interest-input',
						placeholder: 'Add new interest',
						onKeyPress: (e) => this.handleCustomInterest(e),
						maxLength: 25
					}),
					h(
						'button',
						{
							className: 'add-interest-button',
							onClick: () => this.addCustomInterest()
						},
						'Add'
					)
				])
		]);
	}
});

// Register the widget
if (typeof window !== 'undefined' && window.CMS) {
	window.CMS.registerWidget('researchInterests', ResearchInterestsControl);
}
