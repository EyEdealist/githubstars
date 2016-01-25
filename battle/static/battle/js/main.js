(function($, React, ReactDOM) {

    var InputAlert = React.createClass({
        render: function() {
            var classes = ['alert', this.props.type];

            if(!!this.props.message) {
                classes = classes.concat('show');
            }

            return (
                <div className={classes.join(' ')}>
                    <p>{this.props.message}</p>
                </div>
            );
        }
    });

    var RepoInput = React.createClass({
        render: function() {
            var result = this.props.getResult();

            return (
                <div className='repo-input'>
                    <input type="text" placeholder="github.com/:user/:repository" onChange={this.props.onChange} autoFocus={this.props.autoFocus} />
                    <InputAlert type="error" message={this.props.error} />
                    <InputAlert type={['result', result].join(' ')} message={result} />
                </div>
            );
        }
    });

    var Counter = React.createClass({
        render: function() {
            var height = (this.props.count && this.props.max) ? (this.props.count/this.props.max * 100) : 0;
            var classes = ['counter', this.props.type];
            var styles = {height: height + '%'};

            return (
                <figure className={classes.join(' ')} style={styles} title={this.props.title}>
                    <span className="icon" />
                    <span className="count">{this.props.count}</span>
                </figure>
            );
        }
    });

    var RepoChart = React.createClass({
        render: function() {
            var classes = 'repo-chart' + (this.props.show ? ' show' : '');

            return (
                <div className={classes}>
                    <Counter type="stars" count={this.props.data.stars} max={this.props.max} title="Stars" />
                    <Counter type="subs" count={this.props.data.subs} max={this.props.max} title="Subscribers" />
                    <Counter type="forks" count={this.props.data.forks} max={this.props.max} title="Forks" />
                </div>
            );
        }
    });

    var BattleForm = React.createClass({
        updateRepoState: function(key, data) {
            var state = {};

            state[key] = Object.assign({}, this.state[key], data);
            this.setState(state);
        },
        getResultText: function(key) {
            if(!this.state.winner || this.state.winner === 'tied') {
                return this.state.winner;
            }

            return (this.state.winner === key) ? 'winner' : 'loser';
        },
        validateInput: function(key) {
            var error, matches;
            var re = /github\.com\/([a-zA-Z0-9\-]+)\/([a-zA-Z0-9\-]+)/i;

            if(!this.state[key].url) {
                error = 'A GitHub repository URL is required';
            } else {
                matches = re.exec(this.state[key].url.trim());

                if(!matches) {
                    error = 'Invalid GitHub URL format';
                }
            }

            if(error) {
                this.updateRepoState(key, {error: error});
                return false;
            }

            this.updateRepoState(key, {
                user: matches[1],
                repo: matches[2]
            });
            return true;
        },
        loadRepo: function(key) {
            // Short-circuit if data already loaded
            if(this.state[key].data.stars) {
                return;
            }

            return $.ajax({
                url: 'https://api.github.com/repos/' + this.state[key].user + '/' + this.state[key].repo,
                method: 'GET'
            }).done(
                // Update state with fetched data on success
                function(data) {
                    this.updateRepoState(key, {
                        data: {
                            stars: data.stargazers_count || 0,
                            subs: data.subscribers_count || 0,
                            forks: data.forks_count || 0
                        }
                    });
                }.bind(this)
            ).fail(
                // Update state with error message on failure
                function(xhr, res, err) {
                    if(xhr.status === 404) {
                        this.updateRepoState(key, {error: 'Repository Not Found'});
                    } else {
                        this.updateRepoState(key, {error: res});
                    }
                }.bind(this)
            );
        },
        reposLoaded: function() {
            // Get highest value to calculate counter heights
            var max = [
                this.state.left.data.stars, this.state.left.data.subs, this.state.left.data.forks,
                this.state.right.data.stars, this.state.right.data.subs, this.state.right.data.forks
            ].sort(function(l, r) {
                // Sort in reverse order
                return r - l;
            })[0];

            // Determine winner
            var winner = this.state.left.data.stars - this.state.right.data.stars;
            if(winner > 0) {
                winner = 'left';
            } else if(winner < 0) {
                winner = 'right';
            } else {
                winner = 'tied';
            }

            // Update state to display charts
            this.setState({
                winner: winner,
                chart: {
                    show: true,
                    maxValue: max
                }
            });
        },
        handleChange: function(key, event) {
            // Reset charts and winner status when input changes
            var state = {
                winner: null,
                chart: {}
            };
            // Update URL and reset errors and loaded data when input changes
            state[key] = {
                url: event.target.value,
                error: null,
                data: {}
            };

            this.setState(state);
        },
        handleSubmit: function(event) {
            event.preventDefault();

            var left = this.validateInput('left'),
                right = this.validateInput('right');

            if(left && right) {
                // Delay loading repo data until event queue clear and state has been updated
                setTimeout(function() {
                    $.when(this.loadRepo('left'), this.loadRepo('right')).done(this.reposLoaded);
                }.bind(this), 0);
            }
        },
        getInitialState: function() {
            return {
                chart: {
                    show: false,
                    maxValue: 0
                },
                left: {
                    url: '',
                    data: {}
                },
                right: {
                    url: '',
                    data: {}
                }
            };
        },
        render: function() {
            return (
                <form onSubmit={this.handleSubmit}>
                    <fieldset>

                        <div className="repo left">
                            <RepoChart
                                show={this.state.chart.show}
                                max={this.state.chart.maxValue}
                                data={this.state.left.data}
                            />
                            <RepoInput
                                error={this.state.left.error}
                                onChange={this.handleChange.bind(this, 'left')}
                                getResult={this.getResultText.bind(this, 'left')}
                                autoFocus={true}
                            />
                        </div>

                        <span className="vs">vs</span>

                        <div className="repo right">
                            <RepoChart
                                show={this.state.chart.show}
                                max={this.state.chart.maxValue}
                                data={this.state.right.data}
                            />
                            <RepoInput
                                error={this.state.right.error}
                                onChange={this.handleChange.bind(this, 'right')}
                                getResult={this.getResultText.bind(this, 'right')}
                            />
                        </div>

                    </fieldset>
                    <button type="submit">Battle</button>
                </form>
            );
        }
    });

    ReactDOM.render(<BattleForm />, document.getElementsByClassName('battle')[0]);

})($, React, ReactDOM);
