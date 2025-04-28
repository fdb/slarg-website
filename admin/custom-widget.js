CMS.registerWidget(
	'researchInterests',
	createClass({
		getInitialState: function () {
			return {
				globalTags: [],
				loading: true
			};
		},

		componentDidMount: function () {
			const globalTagsEntry = this.props.entry.getIn(['_data', 'global_tags']);
			if (globalTagsEntry) {
				const globalTags = globalTagsEntry.getIn(['research_interests']) || [];
				this.setState({
					globalTags: globalTags.toJS().filter((tag) => tag.trim() !== ''),
					loading: false
				});
			} else {
				fetch('_data/global-tags.json')
					.then((response) => response.json())
					.then((data) => {
						this.setState({
							globalTags: data.research_interests.filter((tag) => tag.trim() !== ''),
							loading: false
						});
					})
					.catch((error) => {
						console.error('Error loading global tags:', error);
						this.setState({ loading: false });
					});
			}
		},

		handleAddTag: function (newTag) {
			const { value, onChange } = this.props;
			const interests = value || [];
			console.log('fetched');

			if (newTag && !interests.includes(newTag)) {
				console.log(interests);
				onChange([...interests, newTag]);

				// Add to global tags if not already there
				const { globalTags } = this.state;
				console.log(this.state);
				if (!globalTags.includes(newTag)) {
					const globalTagsEntry = this.props.entry.getIn(['_data', 'global_tags']);
					if (globalTagsEntry) {
						const currentGlobalTags = globalTagsEntry.getIn(['research_interests']) || [];
						const newGlobalTags = [...currentGlobalTags.toJS(), newTag];
						this.props.entry.getIn(['_data', 'global_tags', 'research_interests']).set(newGlobalTags);
						// Call Netlify Function to update global-tags.json remotely
						const netlifyIdentity = window.netlifyIdentity;
						if (netlifyIdentity) {
							const user = netlifyIdentity.currentUser();
							const token = user && user.token && user.token.access_token;
							if (token) {
								fetch('/api/update-tags-via-git', {
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
										Authorization: `Bearer ${token}`
									},
									body: JSON.stringify({ interests: newGlobalTags })
								})
									.then((res) => {
										if (!res.ok) throw new Error('Failed to update tags');
										return res.json();
									})
									.then((data) => {
										this.setState({ globalTags: data.research_interests });
									})
									.catch((err) => console.error('Error updating remote tags:', err));
							}
						}
					}
				}
			}
		},

		render: function () {
			const { value, onChange } = this.props;
			const { globalTags, loading } = this.state;
			const interests = value || [];

			return h(
				'div',
				{ className: 'research-interests-widget' },
				h(
					'div',
					{ className: 'selected-interests' },
					interests.map((interest, index) =>
						h(
							'span',
							{ key: index, className: 'interest-tag' },
							interest,
							h(
								'button',
								{
									className: 'remove-interest',
									onClick: (e) => {
										e.preventDefault();
										const newInterests = [...interests];
										newInterests.splice(index, 1);
										onChange(newInterests);
										console.log('remove');
									}
								},
								'×'
							)
						)
					)
				),
				h(
					'div',
					{ className: 'interest-input-container' },
					h('input', {
						type: 'text',
						className: 'interest-input',
						placeholder: 'Add research interest...',
						list: 'global-tags-list',
						onKeyDown: (e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								this.handleAddTag(e.target.value.trim());
								e.target.value = '';
							}
						}
					}),
					h(
						'datalist',
						{ id: 'global-tags-list' },
						globalTags.map((tag, index) => h('option', { key: index, value: tag }))
					),
					h(
						'button',
						{
							className: 'add-interest',
							onClick: (e) => {
								e.preventDefault();
								const input = e.target.previousElementSibling.previousElementSibling;
								this.handleAddTag(input.value.trim());
								input.value = '';
							}
						},
						'Add'
					)
				),
				!loading &&
					globalTags.length > 0 &&
					h(
						'div',
						{ className: 'suggested-tags' },
						h('p', null, 'Suggested tags:'),
						h(
							'div',
							{ className: 'suggested-tags-list' },
							globalTags.map(
								(tag, index) =>
									!interests.includes(tag) &&
									h(
										'button',
										{
											key: index,
											className: 'suggested-tag',
											onClick: (e) => {
												e.preventDefault();
												this.handleAddTag(tag);
											}
										},
										tag
									)
							)
						)
					)
			);
		}
	})
);

if (typeof window !== 'undefined' && window.CMS) {
	window.CMS.registerEventListener({
	  name: "entryPersisted",
	  handler: async ({ entry }) => {
		if (entry.get('collection') === 'people') {
		  console.log("🛎 Person updated, triggering build...");
  
		  try {
			await fetch("https://api.netlify.com/build_hooks/680fb098cfdea44826bcc98a", {
			  method: "POST",
			});
			console.log("✅ Build hook triggered!");
		  } catch (error) {
			console.error("❌ Failed to trigger build hook:", error);
		  }
		}
	  },
	});
  }
  