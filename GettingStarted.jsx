import { run, styled } from 'uebersicht';

export const init = (dispatch) => {
  updateSpaces(dispatch);
};

const EV_FETCH_SPACES = "FETCH_SPACES";
const EV_FETCH_SPACE_FOCUS = "FETCH_SPACE_FOCUS";

// export const command = "yabai -m query --spaces | jq  '[.[] | select(.display == 2)] | length'";
export const command = (dispatch) => {
  // current space
  run("/opt/homebrew/bin/yabai -m query --spaces --space | /opt/homebrew/bin/jq \".id\"").then((result) => {
    const data = {
      focusedSpaceId: JSON.parse(result),
    }
    dispatch({type: EV_FETCH_SPACE_FOCUS, data});
  });

  if (Math.random() < 0.06) {
    updateSpaces(dispatch);
  }
};

const updateSpaces = (dispatch) => {
  run("/opt/homebrew/bin/yabai -m query --spaces | /opt/homebrew/bin/jq \"[.[] | select(.display == `/opt/homebrew/bin/yabai -m query --displays --display first | /opt/homebrew/bin/jq '.index' `)]\"").then((result) => {
    new Promise(async (resolve, reject) => {
      const parsedSpaces = JSON.parse(result);

      const spaces = await Promise.all(parsedSpaces.map(async (space, spaceIndex) => {
        await Promise.all(space.windows.map(async windowId => {
          const result = await run(`/opt/homebrew/bin/yabai -m query --windows --window ${windowId}`).catch(() => {});

          if (result !== undefined) {
            const parsedResult = JSON.parse(result);
            const windowIndex = space.windows.findIndex((wid) => wid === windowId);

            space.windows[windowIndex] = parsedResult;
          }
        }));

        return space;
      }));

      const data = {
        spaces: spaces
      }

      dispatch({type: EV_FETCH_SPACES, data});
    });
  });
};

// the refresh frequency in milliseconds
export const refreshFrequency = 100;

export const initialState = {
  spaces: [],
};

export const updateState = (event, previousState) => {
  switch(event.type) {
    case EV_FETCH_SPACES:
      return {
        ...previousState,
        spaces: event.data.spaces,
      };
    case EV_FETCH_SPACE_FOCUS:
      return {
        ...previousState,
        focusedSpaceId: event.data.focusedSpaceId,
      };
    default: {
      return previousState;
    }
  }
};

// the CSS style for this widget, written using Emotion
// https://emotion.sh/
export const className =`
  top: 0px;
  left: 0;
  right: 0;
  height: 200px;
  width: 100%;
  margin: auto;
  padding: 4px;
  border-radius: 4px;
  box-sizing: border-box;
  background-color: #000;
  color: white;
  opacity: 1.0;
  font-family: Helvetica Neue;

  * {
    box-sizing: border-box;
  }
`;

const SpaceContainer = styled('div')`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: repeat(1fr);

  height: 100%;
  width: 50%;

  gap: 1px;
`;

const Space = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  height: 44px;
  width: 100%;

  margin: 2px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow-x: hidden;

  font-size: 1rem;
  overflow-x: hidden;

  cursor: pointer;

  &.has-focus {
    background: #511;
  }

  &:hover {
    background: #115;
  }
`;

const App = styled('div')`
  display: flex;

  height: 100%;
  width: 100%;

  gap: 8px;

  form {
    display: flex;
    height: 100%;
    width: 100%;
  }

  textarea {
    height: 100%;
    width: 100%;

    background: transparent;
    color: white;
    font-size: 1.2rem;
  }
`;

const Window = styled('span')`
  user-select: none;
  display: inline;
  border: 1px solid white;
  text-overflow: ellipsis;
`;

const onSpaceClick = (space, dispatch) => {
  run(`/opt/homebrew/bin/yabai -m space --focus ${space.index}`);
};

const urlToImg = (url, invert) => {
  invert ||= false;

  return (
    <img src={url} style={{maxWidth: 100 + "%", maxHeight: 2.5 + "rem", filter: invert && 'invert(100%)'}}/>
  );
}

const slackLogo = () => {
  const slackLogoUrl = "https://spin.atomicobject.com/wp-content/uploads/slack-logo-2048x522.jpg"

  return urlToImg(slackLogoUrl);
}

const spotifyLogo = () => {
  const slackLogoUrl = "https://storage.googleapis.com/spotifynewsroom-jp.appspot.com/1/2020/12/Spotify_Logo_RGB_Green.png";

  return urlToImg(slackLogoUrl);
}

const elementFromUrlAndText = (url, text, invert) => {
  const Styled = styled('span')`
    text-wrap: nowrap;
    word-wrap: nowrap;
    vertical-align: middle;
    gap: 0.25rem;
  `;

  const Title = styled('span')`
    font-family: "Segoe UI","Helvetica Neue","Helvetica",Arial,sans-serif;
    font-size: 1.25rem;
  `;

  return (
    <Styled>
      <span>
        {urlToImg(url, invert)}
      </span>
      <Title>{text}</Title>
    </Styled>
  );
};
const windowToElement = (window) => {
  const summary = windowToSummary(window);
  const detail = windowToDetail(window)

  const Detail = styled('span')`
    font-size: 1.0rem;
    text-wrap: none;
  `;

  return (
    <div>
      <span>{summary}</span>
      <Detail>{detail}</Detail>
    </div>
  );
}

const windowToDetail = (window) => {
  const app = window.app?.toLowerCase();

  if (app === "code" || app === "vivaldi") {
    const detail = window.title;

    return detail;
  } else {
    return null;
  }
};

const windowToSummary = (window) => {
  const app = window.app?.toLowerCase();

  if (app == null) {
    return "❓";
  } else if(app === "slack") {
    return slackLogo();
  } else if(app === "spotify") {
    return spotifyLogo();
  } else if(app === "code") {
    return elementFromUrlAndText("https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/75px-Visual_Studio_Code_1.35_icon.svg.png", "VSCode");
  } else if(app === "terminal") {
    return elementFromUrlAndText("https://upload.wikimedia.org/wikipedia/commons/b/b3/Terminalicon2.png", "Terminal");
  } else if(app === "alacritty") {
    return elementFromUrlAndText("https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Alacritty_logo.svg/2300px-Alacritty_logo.svg.png", "Alacritty");
  } else if(app === "vivaldi") {
    return urlToImg("data:image/png;base64,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");
  } else if(app === "notion") {
    return urlToImg("https://get.site/wp-content/uploads/2021/10/notion-logo.png", true);
  } else if(app === "tableplus") {
    return urlToImg("https://www.tcdigital.jp/dev_blog/wp-content/uploads/2019/06/ab17c178cd28a55ab26442416988b700.png");
  } else {
    return app;
  }
};

const onNoteSubmit = (event) => {
  const formData = new FormData(event.target);
  const note = formData.get("note");
  run(`echo "${note}" > $HOME/desktop/note.text`);
};

const renderSpaces = (spaces, focusedSpaceId) => {
  return (
    <SpaceContainer>
      {
        spaces && spaces.map(space => {
          const hasFocus = space.id === focusedSpaceId;
          const windows = space.windows.filter((window) => window["is-hidden"] === false && window["is-minimized"] === false);

          return (
            <Space key={space.id} className={hasFocus ? "has-focus" : ""} onClick={() => onSpaceClick(space)}>
              {
                windows && windows
                  .map((window, index) => {
                    return (
                      <Window key={window.id}> {windowToElement(window)} </Window>
                    );
                  })
              }
            </Space >
          );
        })
      }
    </SpaceContainer>
  );
};

const ButtonLink = styled('a')`
  button {
    cursor: pointer;
    background: black;
    color: white;
    border: 1px #555 solid;
  }

  &:hover {
    background: red;
  }
`;

// render gets called after the shell command has executed. The command's output
// is passed in as a string.
export const render = ({spaces, focusedSpaceId}) => {
  return (
    <App>
      {renderSpaces(spaces, focusedSpaceId)}
      <div style={{display: 'none'}}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <ButtonLink href='https://keep.google.com/u/3/#home'>
            <button>
              Open Google Note
            </button>
          </ButtonLink>
          <ButtonLink href='https://git.l.twogate.net'>
            <button>
              Open Gitlab
            </button>
          </ButtonLink>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <ButtonLink href='https://git.l.twogate.net'>
            <button>
              Open ChatGPT
            </button>
          </ButtonLink>
        </div>
      </div>
      <form style={{ display: 'flex', flexDirection: 'column' }} onSubmit={(e) => onNoteSubmit(e)}>
        <input type='submit'/>
        <textarea name='note'/>
      </form>
    </App>
  );
}

